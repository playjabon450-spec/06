import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
const PAGE = 25;
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const sp = new URL(req.url).searchParams; const g = (k: string) => sp.get(k) || ''; const page = Math.max(1, Number(g('page')) || 1); const w: any = { guildId };
  if (g('status')) w.status = g('status'); if (g('category')) w.categoryId = g('category'); if (g('priority')) w.priority = g('priority'); if (g('claimed')) w.claimedBy = g('claimed');
  const q = g('q').replace('#', ''); if (/^\d+$/.test(q)) w.OR = [{ number: Number(q) }, { userId: q }];
  const [tickets, total, categories] = await Promise.all([prisma.ticket.findMany({ where: w, orderBy: { openedAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE, select: { id: true, number: true, categoryId: true, userId: true, status: true, priority: true, claimedBy: true, openedAt: true, closedAt: true, firstResponseAt: true, rating: true, ratingComment: true, summary: true, closeReason: true, kbResult: true, sla: true, transcript: false } }),
    prisma.ticket.count({ where: w }), prisma.ticketCategory.findMany({ where: { guildId }, select: { id: true, name: true } })]);
  return { tickets, total, pages: Math.max(1, Math.ceil(total / PAGE)), categories };
});
