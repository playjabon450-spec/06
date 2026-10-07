import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
const PAGE = 25;
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const sp = new URL(req.url).searchParams; const page = Math.max(1, Number(sp.get('page')) || 1); const w: any = { guildId };
  if (sp.get('kind')) w.kind = sp.get('kind'); const u = sp.get('user') || ''; if (/^\d{5,25}$/.test(u)) w.userId = u;
  const [incidents, total, byKind] = await Promise.all([prisma.shieldIncident.findMany({ where: w, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE }), prisma.shieldIncident.count({ where: w }),
    prisma.shieldIncident.groupBy({ by: ['kind'], where: { guildId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, _count: true })]);
  return { incidents, total, pages: Math.max(1, Math.ceil(total / PAGE)), week: Object.fromEntries(byKind.map((k) => [k.kind, k._count])) };
});
