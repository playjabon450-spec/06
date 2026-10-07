const D = require('./days');
// Members who were active in the last 30 days (>=3 active days) but silent for `days`+ days and still in the guild.
async function churnList(db, guildId, days, tz, limit = 200) {
  const now = Date.now(); const cands = await db.memberActivity.findMany({ where: { guildId, leftAt: null, lastMessageAt: { gt: new Date(now - 30 * 86400000), lte: new Date(now - days * 86400000) } }, orderBy: { lastMessageAt: 'desc' }, take: 500 }); if (!cands.length) return [];
  const since = D.local(now - 30 * 86400000, tz).day; const g = await db.memberDay.groupBy({ by: ['userId'], where: { guildId, userId: { in: cands.map((c) => c.userId) }, day: { gte: since } }, _count: true }); const cnt = new Map(g.map((x) => [x.userId, x._count]));
  return cands.filter((c) => (cnt.get(c.userId) || 0) >= 3).slice(0, limit).map((c) => ({ userId: c.userId, lastMessageAt: c.lastMessageAt, activeDays: cnt.get(c.userId) }));
}
// Subscriptions about to expire (<=3 days) or lapsed in the last 30 days, with product names.
async function subscriptions(db, guildId, now = Date.now()) {
  const subs = await db.subscription.findMany({ where: { guildId, OR: [{ removedAt: null, expiresAt: { gt: new Date(now), lte: new Date(now + 3 * 86400000) } }, { expiresAt: { lte: new Date(now), gt: new Date(now - 30 * 86400000) } }] }, orderBy: { expiresAt: 'asc' }, take: 200 });
  const items = await db.orderItem.findMany({ where: { orderId: { in: subs.map((s) => s.orderId) } }, select: { orderId: true, productName: true, packageName: true } });
  return subs.map((s) => ({ id: s.id, userId: s.userId, expiresAt: s.expiresAt, state: +s.expiresAt > now ? 'expiring' : 'lapsed', product: items.find((i) => i.orderId === s.orderId)?.productName || '—', package: items.find((i) => i.orderId === s.orderId)?.packageName || '', reminded: s.remindedAt }));
}
module.exports = { churnList, subscriptions };
