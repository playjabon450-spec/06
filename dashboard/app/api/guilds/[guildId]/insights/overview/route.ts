import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
import { bot } from '@/lib/discord';
import { tzOf, localDay, addDays } from '@/lib/insightsUtil';
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get('days')) || 30)); const tz = await tzOf(guildId); const today = localDay(Date.now(), tz);
  const [rows, ai, digest] = await Promise.all([prisma.analyticsDaily.findMany({ where: { guildId, day: { gte: addDays(today, -days), lt: today } }, orderBy: { day: 'asc' } }), prisma.aiSummary.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 5 }), prisma.insightsDigest.findFirst({ where: { guildId }, orderBy: { createdAt: 'desc' } })]);
  const sum = (f: (r: any) => number) => rows.reduce((a, r) => a + f(r), 0); const hours = Array(24).fill(0); const chan: Record<string, number> = {}, prod: Record<string, number> = {}, meth: Record<string, number> = {};
  rows.forEach((r: any) => { (r.byHour || []).forEach((n: number, h: number) => (hours[h] += n)); Object.entries(r.byChannel || {}).forEach(([c, n]: any) => (chan[c] = (chan[c] || 0) + n)); Object.entries(r.revenueByProduct || {}).forEach(([c, n]: any) => (prod[c] = (prod[c] || 0) + n)); Object.entries(r.revenueByMethod || {}).forEach(([c, n]: any) => (meth[c] = (meth[c] || 0) + n)); });
  let names: Record<string, string> = {}; try { (await bot(`/guilds/${guildId}/channels`)).forEach((c: any) => (names[c.id] = c.name)); } catch { /* names fall back to ids */ }
  const top = Object.entries(chan).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ name: '#' + (names[id] || id), n })); const last = [...rows].reverse().find((r: any) => r.health);
  return { days, today, series: rows.map((r: any) => ({ day: r.day.slice(5), joined: r.joined, left: r.left, messages: r.messages, active: r.activeMembers, revenue: r.revenue, orders: r.orders, paid: r.paidOrders, tickets: r.ticketsOpened })), hours: hours.map((n, h) => ({ h: `${h}`, n })), topChannels: top,
    byProduct: Object.entries(prod).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 8), byMethod: Object.entries(meth).map(([name, n]) => ({ name, n })),
    totals: { joined: sum((r) => r.joined), left: sum((r) => r.left), members: rows.length ? (rows[rows.length - 1] as any).members : 0, messages: sum((r) => r.messages), activeAvg: rows.length ? Math.round(sum((r) => r.activeMembers) / rows.length) : 0, revenue: Math.round(sum((r) => r.revenue) * 100) / 100, orders: sum((r) => r.orders), paid: sum((r) => r.paidOrders), ticketsOpened: sum((r) => r.ticketsOpened), ticketsClosed: sum((r) => r.ticketsClosed), shield: sum((r) => r.shieldIncidents) },
    health: last ? (last as any).health : null, aiSummaries: ai, digest: digest?.data || null, digestAt: digest?.createdAt || null, hasData: rows.length > 0 };
});
