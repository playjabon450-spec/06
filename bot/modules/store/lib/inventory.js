// Atomic key pop: find an unused key, then claim it with a conditional update (used:false). Losing a race => retry with the next key.
async function claimKey(db, productId, orderId, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const k = await db.stockKey.findFirst({ where: { productId, used: false }, orderBy: { createdAt: 'asc' } }); if (!k) return null;
    const r = await db.stockKey.updateMany({ where: { id: k.id, used: false }, data: { used: true, usedByOrder: orderId, usedAt: new Date() } });
    if (r.count === 1) return k;
  }
  return null;
}
module.exports = { claimKey };
