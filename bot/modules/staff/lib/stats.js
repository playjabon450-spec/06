// Staff statistics (DB). Also mirrored in dashboard/lib/staffStats.ts — keep formulas identical.
const BOT = new Set(['system', 'bot:auto', 'system:free', 'system:auto']);
const MOD_ACTIONS = ['shield.kick', 'shield.ban', 'shield.restore', 'shield.appeal.review', 'shield.note', 'tickets.close'];
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
// Leaderboard points: claimed*2 + closed*3 + orders*2 + mod*1 + messages*0.1 + (avgRating-3)*5 (if rated)
const points = (m) => Math.round((m.claimed * 2 + m.closed * 3 + m.orders * 2 + m.mod + m.messages * 0.1 + (m.avgRating ? (m.avgRating - 3) * 5 : 0)) * 10) / 10;
async function compute(db, guildId, since, until = new Date()) {
  const R = { createdAt: { gte: since, lte: until } };
  const [claimed, closed, firstResp, orders, mod, daily] = await Promise.all([
    db.ticket.findMany({ where: { guildId, claimedBy: { not: null }, openedAt: { gte: since, lte: until } }, select: { claimedBy: true, rating: true, openedAt: true } }),
    db.ticket.findMany({ where: { guildId, status: 'closed', closedAt: { gte: since, lte: until } }, select: { claimedBy: true, closedBy: true, openedAt: true, closedAt: true, rating: true } }),
    db.staffEvent.findMany({ where: { guildId, kind: 'first_response', ...R }, select: { userId: true, value: true } }),
    db.payment.findMany({ where: { status: 'confirmed', confirmedBy: { not: null }, createdAt: { gte: since, lte: until }, order: { guildId } }, select: { confirmedBy: true, createdAt: true } }),
    db.auditLog.findMany({ where: { guildId, action: { in: MOD_ACTIONS }, ...R }, select: { userId: true, createdAt: true } }),
    db.staffDaily.findMany({ where: { guildId, day: { gte: dayKey(since), lte: dayKey(until) } } }),
  ]);
  const m = new Map(); const get = (id) => { if (!m.has(id)) m.set(id, { userId: id, claimed: 0, closed: 0, orders: 0, mod: 0, messages: 0, _fr: [], _res: [], _rt: [] }); return m.get(id); };
  claimed.forEach((t) => get(t.claimedBy).claimed++);
  closed.forEach((t) => { const who = t.closedBy && !BOT.has(t.closedBy) ? t.closedBy : t.claimedBy; if (who) { const s = get(who); s.closed++; s._res.push((+t.closedAt - +t.openedAt) / 60000); } if (t.claimedBy && t.rating) get(t.claimedBy)._rt.push(t.rating); });
  firstResp.forEach((e) => get(e.userId)._fr.push(e.value));
  orders.filter((p) => !BOT.has(p.confirmedBy)).forEach((p) => get(p.confirmedBy).orders++);
  mod.filter((a) => !BOT.has(a.userId)).forEach((a) => get(a.userId).mod++);
  daily.forEach((d) => get(d.userId).messages += d.messages);
  const rows = [...m.values()].map((s) => { const r = { userId: s.userId, claimed: s.claimed, closed: s.closed, orders: s.orders, mod: s.mod, messages: s.messages, avgFirstResponse: avg(s._fr) == null ? null : Math.round(avg(s._fr) * 10) / 10, avgResolution: avg(s._res) == null ? null : Math.round(avg(s._res)), avgRating: avg(s._rt) == null ? null : Math.round(avg(s._rt) * 10) / 10, ratings: s._rt.length }; r.points = points(r); return r; }).sort((a, b) => b.points - a.points);
  return { rows, since, until };
}
// Last time a staff member did anything measurable (null = never).
async function lastActive(db, guildId, userId) {
  const q = await Promise.all([db.ticket.findFirst({ where: { guildId, OR: [{ claimedBy: userId }, { closedBy: userId }] }, orderBy: { openedAt: 'desc' }, select: { openedAt: true } }).then((x) => x?.openedAt),
    db.staffEvent.findFirst({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).then((x) => x?.createdAt), db.staffDaily.findFirst({ where: { guildId, userId, messages: { gt: 0 } }, orderBy: { day: 'desc' }, select: { day: true } }).then((x) => (x ? new Date(x.day + 'T23:59:59Z') : null)),
    db.payment.findFirst({ where: { confirmedBy: userId, order: { guildId } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).then((x) => x?.createdAt), db.auditLog.findFirst({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).then((x) => x?.createdAt)]);
  const ts = q.filter(Boolean).map((d) => +new Date(d)); return ts.length ? new Date(Math.max(...ts)) : null;
}
module.exports = { compute, lastActive, points, avg, MOD_ACTIONS, BOT };
