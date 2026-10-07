import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
// SLA report for the last N days (default 30): per category averages + breach counts + breached ticket list.
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30)); const since = new Date(Date.now() - days * 86400000);
  const [tickets, cats] = await Promise.all([prisma.ticket.findMany({ where: { guildId, openedAt: { gte: since } }, select: { id: true, number: true, categoryId: true, status: true, openedAt: true, firstResponseAt: true, closedAt: true, sla: true, rating: true } }), prisma.ticketCategory.findMany({ where: { guildId } })]);
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const rows = cats.map((c) => { const ts = tickets.filter((t) => t.categoryId === c.id); const fr = ts.filter((t) => t.firstResponseAt).map((t) => (+t.firstResponseAt! - +t.openedAt) / 60000); const rs = ts.filter((t) => t.closedAt).map((t) => (+t.closedAt! - +t.openedAt) / 60000);
    return { id: c.id, name: c.name, firstResponseMin: c.firstResponseMin, resolutionMin: c.resolutionMin, total: ts.length, open: ts.filter((t) => t.status === 'open').length, avgFirstResponse: avg(fr), avgResolution: avg(rs),
      frBreaches: ts.filter((t) => (t.sla as any)?.frBreach).length, resBreaches: ts.filter((t) => (t.sla as any)?.resBreach).length, avgRating: (() => { const r = ts.filter((t) => t.rating).map((t) => t.rating!); return r.length ? Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10 : null; })() }; });
  const breached = tickets.filter((t) => (t.sla as any)?.frBreach || (t.sla as any)?.resBreach).map((t) => ({ id: t.id, number: t.number, category: cats.find((c) => c.id === t.categoryId)?.name || '—', status: t.status, fr: !!(t.sla as any)?.frBreach, res: !!(t.sla as any)?.resBreach })).slice(0, 100);
  return { days, rows, breached, totalTickets: tickets.length };
});
