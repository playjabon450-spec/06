import { prisma } from '@/lib/prisma';
import { ownerRoute } from '@/lib/owner';
export const GET = ownerRoute(null, async () => {
  const [hb, gl, mt, bl, dbGuilds] = await Promise.all([prisma.botState.findUnique({ where: { key: 'heartbeat' } }), prisma.botState.findUnique({ where: { key: 'guilds' } }), prisma.botState.findUnique({ where: { key: 'maintenance' } }), prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }), prisma.guild.count()]);
  const h: any = hb?.value || null; const age = h?.beat ? Date.now() - h.beat : null;
  return { bot: h ? { online: age != null && age < 90000, lastBeatMs: age, uptimeSec: Math.floor((Date.now() - h.startedAt) / 1000), ping: h.ping, guilds: h.guilds, memoryMb: h.memoryMb, node: h.node } : null, maintenance: !!(mt?.value as any)?.enabled, guilds: ((gl?.value as any[]) || []).sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)), blacklist: bl, dbGuilds };
});
