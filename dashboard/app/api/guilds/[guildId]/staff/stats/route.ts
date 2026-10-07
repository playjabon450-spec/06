import { guildRoute } from '@/lib/api';
import { staffStats } from '@/lib/staffStats';
import { bot } from '@/lib/discord';
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 7)); const r = await staffStats(guildId, days);
  const names: Record<string, string> = {}; await Promise.all(r.rows.slice(0, 30).map(async (x) => { try { const u = await bot(`/users/${x.userId}`); names[x.userId] = u.global_name || u.username; } catch { names[x.userId] = x.userId; } }));
  return { ...r, rows: r.rows.map((x) => ({ ...x, name: names[x.userId] || x.userId })), days };
});
