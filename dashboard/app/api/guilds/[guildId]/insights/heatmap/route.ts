import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
import { tzOf, localDay, addDays, weekday, bestTimes } from '@/lib/insightsUtil';
// 7x24 message heatmap over the last 28 local days (hours already in guild timezone).
export const GET = guildRoute(null, async ({ guildId }) => {
  const tz = await tzOf(guildId); const today = localDay(Date.now(), tz); const rows = await prisma.insightsMsg.groupBy({ by: ['day', 'hour'], where: { guildId, day: { gte: addDays(today, -28) } }, _sum: { count: true } });
  const cells = rows.map((r) => ({ weekday: weekday(r.day), hour: r.hour, count: r._sum.count || 0 })); const grid = Array.from({ length: 7 }, () => Array(24).fill(0)); cells.forEach((c) => (grid[c.weekday][c.hour] += c.count));
  return { grid, best: bestTimes(cells, 3), max: Math.max(1, ...grid.flat()), tz };
});
