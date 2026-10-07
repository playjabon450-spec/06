const D = require('./days'); const H = require('./health');
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
// Aggregates one LOCAL day into AnalyticsDaily (never touches joined/left, which are incremented live) and stores a health snapshot.
async function aggregateDay(db, guildId, day, tz, memberCount = 0) {
  const { start, end } = D.dayRange(day, tz); const R = (f) => ({ [f]: { gte: start, lt: end } });
  const [msgs, active, ordersOpened, paid, tOpened, tClosed, inc, methods] = await Promise.all([db.insightsMsg.findMany({ where: { guildId, day } }), db.memberDay.count({ where: { guildId, day } }),
    db.order.count({ where: { guildId, status: { not: 'draft' }, ...R('createdAt') } }), db.order.findMany({ where: { guildId, status: { in: ['paid', 'delivered'] }, ...R('paidAt') }, include: { items: true } }),
    db.ticket.count({ where: { guildId, ...R('openedAt') } }), db.ticket.count({ where: { guildId, ...R('closedAt') } }), db.shieldIncident.count({ where: { guildId, ...R('createdAt') } }), db.paymentMethod.findMany({ where: { guildId }, select: { id: true, name: true } })]);
  const byHour = Array(24).fill(0), byChannel = {}; msgs.forEach((m) => { byHour[m.hour] += m.count; byChannel[m.channelId] = (byChannel[m.channelId] || 0) + m.count; });
  const byProduct = {}, byMethod = {}; paid.forEach((o) => { const p = o.items[0]?.productName || '—'; byProduct[p] = (byProduct[p] || 0) + o.total; const mn = methods.find((x) => x.id === o.methodId)?.name || (o.methodId === 'free' ? 'مجاني' : '—'); byMethod[mn] = (byMethod[mn] || 0) + o.total; });
  const data = { messages: sum(msgs, (m) => m.count), activeMembers: active, byHour, byChannel, orders: ordersOpened, paidOrders: paid.length, revenue: Math.round(sum(paid, (o) => o.total) * 100) / 100, revenueByProduct: byProduct, revenueByMethod: byMethod, ticketsOpened: tOpened, ticketsClosed: tClosed, shieldIncidents: inc, aggregatedAt: new Date() };
  if (memberCount) data.members = memberCount;
  const row = await db.analyticsDaily.upsert({ where: { guildId_day: { guildId, day } }, create: { guildId, day, ...data }, update: data });
  // health over the last 14 days (including this one)
  const rows = await db.analyticsDaily.findMany({ where: { guildId, day: { gte: D.addDays(day, -13), lte: day } } }); const since = new Date(start.getTime() - 13 * 86400000);
  const [rated, fr, hasStore, hasTickets] = await Promise.all([db.ticket.findMany({ where: { guildId, rating: { not: null }, closedAt: { gte: since, lt: end } }, select: { rating: true } }), db.staffEvent.findMany({ where: { guildId, kind: 'first_response', createdAt: { gte: since, lt: end } }, select: { value: true } }),
    db.product.count({ where: { guildId } }), db.ticketCategory.count({ where: { guildId } })]);
  const members = row.members || memberCount || 0; const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const health = H.healthScore({ members, joined: sum(rows, (r) => r.joined), left: sum(rows, (r) => r.left), activeAvg: sum(rows, (r) => r.activeMembers) / Math.max(1, rows.length), ticketsOpened: sum(rows, (r) => r.ticketsOpened), ticketsClosed: sum(rows, (r) => r.ticketsClosed),
    avgRating: avg(rated.map((x) => x.rating)), avgFirstResponse: avg(fr.map((x) => x.value)), shieldIncidents: sum(rows, (r) => r.shieldIncidents), orders: sum(rows, (r) => r.orders), paidOrders: sum(rows, (r) => r.paidOrders), hasStore: hasStore > 0, hasTickets: hasTickets > 0 });
  await db.analyticsDaily.update({ where: { id: row.id }, data: { health } }); return { ...row, health };
}
module.exports = { aggregateDay };
