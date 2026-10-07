// DB-level order operations (no Discord imports so they are unit-testable).
const { claimKey } = require('./inventory');
const OPEN = ['draft', 'awaiting_payment', 'awaiting_confirmation'];
const FINAL = ['delivered', 'cancelled', 'refunded', 'expired'];
async function nextNumber(db, guildId) {
  for (let i = 0; i < 3; i++) {
    try { return (await db.orderCounter.upsert({ where: { guildId }, create: { guildId, last: 1001 }, update: { last: { increment: 1 } } })).last; }
    catch (e) { if (e.code !== 'P2002' || i === 2) throw e; }
  }
}
async function createOrder(db, { guildId, userId, expireMinutes = 60 }) {
  for (let i = 0; i < 3; i++) {
    try { return await db.order.create({ data: { guildId, userId, number: await nextNumber(db, guildId), status: 'draft', expiresAt: new Date(Date.now() + expireMinutes * 60000) } }); }
    catch (e) { if (e.code !== 'P2002' || i === 2) throw e; }
  }
}
// Marks the order paid, consumes stock (limited count or one key) and counts the coupon use — all in ONE transaction.
// Returns { ok:false, reason:'already' } when another confirmation won the race. A reused transferMessageId throws P2002 (and rolls everything back).
async function confirmPayment(db, orderId, { by, amount, transferMessageId = null, paymentId = null, methodId = null }) {
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } }); if (!o) return { ok: false, reason: 'missing' };
    const got = await tx.order.updateMany({ where: { id: orderId, status: { in: ['awaiting_payment', 'awaiting_confirmation'] } }, data: { status: 'paid', paidAt: new Date() } });
    if (!got.count) return { ok: false, reason: 'already' };
    let outOfStock = false; const item = o.items?.[0];
    if (item) {
      const p = await tx.product.findUnique({ where: { id: item.productId } });
      if (p?.stockMode === 'limited') { const r = await tx.product.updateMany({ where: { id: p.id, stockCount: { gt: 0 } }, data: { stockCount: { decrement: 1 } } }); if (!r.count) outOfStock = true; }
      else if (p?.stockMode === 'keys') { if (!(await claimKey(tx, p.id, o.id))) outOfStock = true; }
    }
    if (paymentId) await tx.payment.update({ where: { id: paymentId }, data: { status: 'confirmed', confirmedBy: by } });
    else await tx.payment.create({ data: { orderId, methodId: methodId || o.methodId || 'free', amount: amount ?? o.total, status: 'confirmed', confirmedBy: by, transferMessageId } });
    await tx.payment.updateMany({ where: { orderId, status: 'partial' }, data: { status: 'confirmed', confirmedBy: by } });
    if (o.couponId) await tx.coupon.updateMany({ where: { id: o.couponId }, data: { uses: { increment: 1 } } });
    return { ok: true, outOfStock, order: o };
  });
}
// Under-payment: remember the partial transfer (unique transferMessageId => idempotent).
async function recordPartial(db, { orderId, methodId, amount, transferMessageId }) {
  try { await db.payment.create({ data: { orderId, methodId, amount, transferMessageId, status: 'partial' } }); return true; } catch (e) { if (e.code === 'P2002') return false; throw e; }
}
async function partialTotal(db, orderId) { const r = await db.payment.aggregate({ where: { orderId, status: 'partial' }, _sum: { amount: true } }); return r._sum.amount || 0; }
// Cancel (unpaid) or refund (paid/delivered). Releases stock/coupon where it is safe to; returns info for the Discord layer to undo roles.
async function reverseOrder(db, orderId, { by, reason }) {
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } }); if (!o) return { ok: false, reason: 'missing' };
    const unpaid = OPEN.includes(o.status), to = unpaid ? 'cancelled' : 'refunded';
    if (!unpaid && !['paid', 'delivered'].includes(o.status)) return { ok: false, reason: 'final' };
    const r = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data: { status: to, note: String(reason || '').slice(0, 300), expiresAt: new Date() } }); if (!r.count) return { ok: false, reason: 'already' };
    let keyReleased = false;
    if (!unpaid) {
      const item = o.items?.[0]; const p = item && (await tx.product.findUnique({ where: { id: item.productId } }));
      if (p?.stockMode === 'limited') await tx.product.updateMany({ where: { id: p.id }, data: { stockCount: { increment: 1 } } });
      if (p?.stockMode === 'keys' && o.status === 'paid') { const k = await tx.stockKey.updateMany({ where: { usedByOrder: o.id }, data: { used: false, usedByOrder: null, usedAt: null } }); keyReleased = k.count > 0; } // delivered keys stay burnt
      if (o.couponId) await tx.coupon.updateMany({ where: { id: o.couponId, uses: { gt: 0 } }, data: { uses: { decrement: 1 } } });
      await tx.payment.updateMany({ where: { orderId, status: 'confirmed' }, data: { status: 'refunded' } });
      await tx.subscription.updateMany({ where: { orderId, removedAt: null }, data: { removedAt: new Date() } });
    }
    return { ok: true, from: o.status, to, order: o, keyReleased };
  });
}
module.exports = { OPEN, FINAL, nextNumber, createOrder, confirmPayment, recordPartial, partialTotal, reverseOrder };
