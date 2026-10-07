import { prisma } from './prisma';
// Mirror of bot/modules/staff/lib/stats.js — keep formulas identical.
const BOT = new Set(['system', 'bot:auto', 'system:free', 'system:auto']);
const MOD_ACTIONS = ['shield.kick', 'shield.ban', 'shield.restore', 'shield.appeal.review', 'shield.note', 'tickets.close'];
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const points = (m: any) => Math.round((m.claimed * 2 + m.closed * 3 + m.orders * 2 + m.mod + m.messages * 0.1 + (m.avgRating ? (m.avgRating - 3) * 5 : 0)) * 10) / 10;
export async function staffStats(guildId: string, days: number) {
  const until = new Date(), since = new Date(+until - days * 86400000); const R = { createdAt: { gte: since, lte: until } };
  const [claimed, closed, firstResp, orders, mod, daily] = await Promise.all([
    prisma.ticket.findMany({ where: { guildId, claimedBy: { not: null }, openedAt: { gte: since, lte: until } }, select: { claimedBy: true } }),
    prisma.ticket.findMany({ where: { guildId, status: 'closed', closedAt: { gte: since, lte: until } }, select: { claimedBy: true, closedBy: true, openedAt: true, closedAt: true, rating: true } }),
    prisma.staffEvent.findMany({ where: { guildId, kind: 'first_response', ...R }, select: { userId: true, value: true } }),
    prisma.payment.findMany({ where: { status: 'confirmed', confirmedBy: { not: null }, createdAt: { gte: since, lte: until }, order: { guildId } }, select: { confirmedBy: true, createdAt: true } }),
    prisma.auditLog.findMany({ where: { guildId, action: { in: MOD_ACTIONS }, ...R }, select: { userId: true } }),
    prisma.staffDaily.findMany({ where: { guildId, day: { gte: dayKey(since), lte: dayKey(until) } } }),
  ]);
  const m = new Map<string, any>(); const get = (id: string) => { if (!m.has(id)) m.set(id, { userId: id, claimed: 0, closed: 0, orders: 0, mod: 0, messages: 0, _fr: [], _res: [], _rt: [] }); return m.get(id); };
  claimed.forEach((t) => get(t.claimedBy!).claimed++);
  closed.forEach((t) => { const who = t.closedBy && !BOT.has(t.closedBy) ? t.closedBy : t.claimedBy; if (who) { const s = get(who); s.closed++; s._res.push((+t.closedAt! - +t.openedAt) / 60000); } if (t.claimedBy && t.rating) get(t.claimedBy)._rt.push(t.rating); });
  firstResp.forEach((e) => get(e.userId)._fr.push(e.value)); orders.filter((p) => !BOT.has(p.confirmedBy!)).forEach((p) => get(p.confirmedBy!).orders++); mod.filter((a) => !BOT.has(a.userId)).forEach((a) => get(a.userId).mod++); daily.forEach((d) => (get(d.userId).messages += d.messages));
  const rows = [...m.values()].map((s) => { const f = avg(s._fr), r = avg(s._res), g = avg(s._rt); const o: any = { userId: s.userId, claimed: s.claimed, closed: s.closed, orders: s.orders, mod: s.mod, messages: s.messages, avgFirstResponse: f == null ? null : Math.round(f * 10) / 10, avgResolution: r == null ? null : Math.round(r), avgRating: g == null ? null : Math.round(g * 10) / 10 }; o.points = points(o); return o; }).sort((a, b) => b.points - a.points);
  // daily trend for the chart
  const series: Record<string, any> = {}; for (let i = days - 1; i >= 0; i--) { const k = dayKey(new Date(+until - i * 86400000)); series[k] = { day: k.slice(5), closed: 0, orders: 0, messages: 0 }; }
  closed.forEach((t) => { const s = series[dayKey(t.closedAt!)]; if (s) s.closed++; }); orders.filter((p) => !BOT.has(p.confirmedBy!)).forEach((p) => { const s = series[dayKey(p.createdAt)]; if (s) s.orders++; }); daily.forEach((d) => { if (series[d.day]) series[d.day].messages += d.messages; });
  return { rows, series: Object.values(series), since, until };
}
