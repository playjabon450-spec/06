const test = require('node:test'); const assert = require('node:assert/strict');
const { calculate, validateCoupon } = require('../modules/store/lib/pricing');
const { matchTransfer, evaluateAmount, parseTransfer } = require('../modules/store/lib/probot');
const { registerReceipt, sha256 } = require('../modules/store/lib/receipt');
const { claimKey } = require('../modules/store/lib/inventory');
const { confirmPayment } = require('../modules/store/lib/orders');

const vf = { id: 'm1', kind: 'vodafone', config: { feePercent: 2 } };
const pb = { id: 'm2', kind: 'probot', config: { botId: '282859044593598464', recipientId: '111111111111111111', taxPercent: 5, rate: 2, currencyName: 'كريديت' } };

test('price: no coupon, vodafone fee', () => { const r = calculate({ pkg: { priceEgp: 100 }, method: vf }); assert.deepEqual([r.subtotal, r.discount, r.fee, r.total], [100, 0, 2, 102]); });
test('price: percent coupon + fee', () => { const r = calculate({ pkg: { priceEgp: 200 }, coupon: { kind: 'percent', value: 25 }, method: vf }); assert.deepEqual([r.discount, r.base, r.fee, r.total], [50, 150, 3, 153]); });
test('price: fixed coupon cannot exceed subtotal', () => { const r = calculate({ pkg: { priceEgp: 30 }, coupon: { kind: 'fixed', value: 80 }, method: vf }); assert.equal(r.total, 0); });
test('price: credits with tax compensation rounds up', () => { const r = calculate({ pkg: { priceEgp: 100 }, method: pb }); assert.equal(r.base, 200); assert.equal(r.total, 211); /* 200/0.95=210.52 */ });
test('price: coupon applies before conversion and tax', () => { const r = calculate({ pkg: { priceEgp: 100 }, coupon: { kind: 'percent', value: 10 }, method: pb }); assert.equal(r.total, Math.ceil(180 / 0.95)); });
test('price: per-method override keeps coupon ratio', () => { const r = calculate({ pkg: { priceEgp: 100, priceOverrides: { m2: 500 } }, coupon: { kind: 'percent', value: 20 }, method: pb }); assert.equal(r.base, 400); assert.equal(r.total, Math.ceil(400 / 0.95)); });
test('price: exact tax division is not over-rounded', () => { const r = calculate({ pkg: { priceEgp: 95 }, method: { ...pb, config: { ...pb.config, rate: 1 } } }); assert.equal(r.total, 100); });
test('coupon validation rules', () => {
  const c = { active: true, kind: 'percent', value: 10, uses: 0, minOrder: 50, productIds: ['p1'], maxUses: 2, maxPerUser: 1, expiresAt: null };
  assert.equal(validateCoupon(c, { subtotal: 100, productId: 'p1' }).ok, true);
  assert.equal(validateCoupon(c, { subtotal: 10, productId: 'p1' }).reason, 'minOrder');
  assert.equal(validateCoupon(c, { subtotal: 100, productId: 'x' }).reason, 'product');
  assert.equal(validateCoupon(c, { subtotal: 100, productId: 'p1', userUses: 1 }).reason, 'maxPerUser');
  assert.equal(validateCoupon({ ...c, uses: 2 }, { subtotal: 100, productId: 'p1' }).reason, 'maxUses');
  assert.equal(validateCoupon({ ...c, expiresAt: new Date(Date.now() - 1000) }, { subtotal: 100, productId: 'p1' }).reason, 'expired');
  assert.equal(validateCoupon({ ...c, active: false }, { subtotal: 100, productId: 'p1' }).reason, 'invalid');
});

const cust = '222222222222222222';
const msg = (content, o = {}) => ({ authorId: pb.config.botId, content, mentionIds: [], embeds: [], ...o });
const ctx = { method: pb, customerId: cust, customerNames: ['Ahmed'], recipientNames: ['StoreOwner'] };
test('probot: matches mention-style message', () => { const r = matchTransfer(msg(`**:moneybag: | <@${cust}>, has transferred \`$211\` to <@${pb.config.recipientId}> **`), ctx); assert.deepEqual([r.status, r.amount], ['ok', 211]); });
test('probot: matches name-style message with commas', () => { const r = matchTransfer(msg('**:moneybag: | Ahmed, has transferred `$1,200` to StoreOwner **'), ctx); assert.deepEqual([r.status, r.amount], ['ok', 1200]); });
test('probot: wrong recipient', () => { assert.equal(matchTransfer(msg(`<@${cust}>, has transferred \`$211\` to <@999999999999999999>`), ctx).status, 'wrong_recipient'); });
test('probot: wrong sender', () => { assert.equal(matchTransfer(msg(`<@333333333333333333>, has transferred \`$211\` to <@${pb.config.recipientId}>`), ctx).status, 'wrong_sender'); });
test('probot: author must be the configured bot', () => { assert.equal(matchTransfer(msg(`<@${cust}>, has transferred \`$211\` to <@${pb.config.recipientId}>`, { authorId: '5' }), ctx).status, 'ignore'); });
test('probot: non-transfer text ignored; arabic digits parsed', () => { assert.equal(matchTransfer(msg('hello'), ctx).status, 'ignore'); assert.equal(parseTransfer('paid ٢٥٠ to B', 'paid (?<amount>[\\d٠-٩]+)').amount, 250); });
test('probot: custom regex is honoured', () => { const m = { ...pb, config: { ...pb.config, regex: 'paid (?<amount>\\d+) coins to (?<recipient>\\d+) from (?<sender>\\d+)' } }; const r = matchTransfer(msg(`paid 40 coins to ${pb.config.recipientId} from ${cust}`), { ...ctx, method: m }); assert.deepEqual([r.status, r.amount], ['ok', 40]); });
test('amount evaluation: under / exact / over (cumulative)', () => {
  assert.deepEqual(evaluateAmount(0, 100, 211), { status: 'under', total: 100, remaining: 111 });
  assert.equal(evaluateAmount(100, 111, 211).status, 'exact'); assert.equal(evaluateAmount(0, 300, 211).extra, 89);
});

// ---- minimal in-memory Prisma double ----
function fakeDb() {
  const s = { payments: [], keys: [], orders: {}, products: {}, coupons: {} };
  const db = {
    payment: { create: async ({ data }) => { if (data.receiptHash && s.payments.some((p) => p.receiptHash === data.receiptHash)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      if (data.transferMessageId && s.payments.some((p) => p.transferMessageId === data.transferMessageId)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      const p = { id: 'p' + (s.payments.length + 1), ...data }; s.payments.push(p); return p; }, update: async ({ where, data }) => Object.assign(s.payments.find((p) => p.id === where.id), data), updateMany: async () => ({ count: 0 }) },
    stockKey: { findFirst: async ({ where }) => s.keys.find((k) => k.productId === where.productId && k.used === where.used) || null,
      updateMany: async ({ where, data }) => { const k = s.keys.find((x) => x.id === where.id && x.used === where.used); if (!k) return { count: 0 }; Object.assign(k, data); return { count: 1 }; } },
    order: { findUnique: async ({ where }) => ({ ...s.orders[where.id] }), updateMany: async ({ where, data }) => { const o = s.orders[where.id]; if (!o || !where.status.in.includes(o.status)) return { count: 0 }; Object.assign(o, data); return { count: 1 }; } },
    product: { findUnique: async ({ where }) => s.products[where.id], updateMany: async ({ where, data }) => { const p = s.products[where.id]; if (!(p.stockCount > where.stockCount.gt)) return { count: 0 }; p.stockCount -= data.stockCount.decrement; return { count: 1 }; } },
    coupon: { updateMany: async ({ where, data }) => { s.coupons[where.id].uses += data.uses.increment; return { count: 1 }; } },
  };
  db.$transaction = async (fn) => fn(db); return { db, s };
}
test('duplicate receipt is blocked across orders', async () => {
  const { db } = fakeDb(); const h = sha256(Buffer.from('same-image'));
  assert.equal((await registerReceipt(db, { orderId: 'o1', methodId: 'm', amount: 100, url: 'u', hash: h })).ok, true);
  const second = await registerReceipt(db, { orderId: 'o2', methodId: 'm', amount: 100, url: 'u2', hash: h });
  assert.deepEqual([second.ok, second.duplicate], [false, true]);
  assert.equal((await registerReceipt(db, { orderId: 'o2', methodId: 'm', amount: 100, url: 'u3', hash: sha256(Buffer.from('other')) })).ok, true);
});
test('key delivery atomicity: concurrent claims never return the same key', async () => {
  const { db, s } = fakeDb(); s.keys.push({ id: 'k1', productId: 'p', used: false, value: 'AAA' }, { id: 'k2', productId: 'p', used: false, value: 'BBB' });
  const got = await Promise.all(['o1', 'o2', 'o3'].map((o) => claimKey(db, 'p', o)));
  const vals = got.filter(Boolean).map((k) => k.value).sort(); assert.deepEqual(vals, ['AAA', 'BBB']); assert.equal(got.filter((k) => !k).length, 1);
});
test('confirmPayment is idempotent and consumes stock once', async () => {
  const { db, s } = fakeDb(); s.orders.o1 = { id: 'o1', status: 'awaiting_payment', total: 100, methodId: 'm', couponId: 'c1', items: [{ productId: 'p' }] }; s.products.p = { id: 'p', stockMode: 'limited', stockCount: 1 }; s.coupons.c1 = { uses: 0 };
  db.order.findUnique = async ({ where }) => ({ ...s.orders[where.id], items: s.orders[where.id].items });
  const [a, b] = await Promise.all([confirmPayment(db, 'o1', { by: 'staff1' }), confirmPayment(db, 'o1', { by: 'staff2' })]);
  assert.equal([a, b].filter((r) => r.ok).length, 1); assert.equal(s.products.p.stockCount, 0); assert.equal(s.coupons.c1.uses, 1); assert.equal(s.payments.length, 1);
});
test('confirmPayment flags out-of-stock but keeps the payment', async () => {
  const { db, s } = fakeDb(); s.orders.o2 = { id: 'o2', status: 'awaiting_payment', total: 50, methodId: 'm', items: [{ productId: 'k' }] }; s.products.k = { id: 'k', stockMode: 'keys' };
  db.order.findUnique = async ({ where }) => ({ ...s.orders[where.id] });
  const r = await confirmPayment(db, 'o2', { by: 'bot' }); assert.deepEqual([r.ok, r.outOfStock], [true, true]); assert.equal(s.orders.o2.status, 'paid');
});
test('one transfer message can pay only one order', async () => {
  const { db, s } = fakeDb(); for (const id of ['a', 'b']) { s.orders[id] = { id, status: 'awaiting_payment', total: 10, methodId: 'm', items: [] }; }
  db.order.findUnique = async ({ where }) => ({ ...s.orders[where.id] });
  assert.equal((await confirmPayment(db, 'a', { by: 'bot', transferMessageId: 'T1' })).ok, true);
  await assert.rejects(() => confirmPayment(db, 'b', { by: 'bot', transferMessageId: 'T1' }), (e) => e.code === 'P2002');
});
