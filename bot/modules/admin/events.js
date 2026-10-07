const prisma = require('../../core/db'); const log = require('../../core/logger'); const admin = require('../../core/admin');
const startedAt = Date.now(); let started = false;
async function beat({ client }) {
  await prisma.botState.upsert({ where: { key: 'heartbeat' }, create: { key: 'heartbeat', value: {} }, update: { value: { startedAt, beat: Date.now(), ping: client.ws.ping, guilds: client.guilds.cache.size, memoryMb: Math.round(process.memoryUsage().rss / 1048576), node: process.version } } });
}
async function snapshot({ client }) { // guild list for the owner panel + leave blacklisted guilds
  const list = [...client.guilds.cache.values()].slice(0, 500).map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount, icon: g.iconURL?.() || null, joinedAt: g.joinedTimestamp || null, ownerId: g.ownerId }));
  await prisma.botState.upsert({ where: { key: 'guilds' }, create: { key: 'guilds', value: list }, update: { value: list } });
  const c = await admin.load(true); for (const g of client.guilds.cache.values()) if (c.guilds.has(g.id)) { log.warn('leaving blacklisted guild', g.id); await g.leave().catch(() => null); }
}
module.exports = {
  guildCreate: async (ctx, g) => { if ((await admin.load(true)).guilds.has(g.id)) { await g.leave().catch(() => null); log.warn('left blacklisted guild on join', g.id); } },
  ready: async (ctx) => { if (started) return; started = true; const safe = (f) => () => f(ctx).catch((e) => log.warn('admin tick failed', e.message)); setTimeout(safe(beat), 5000); setInterval(safe(beat), 30000); setTimeout(safe(snapshot), 15000); setInterval(safe(snapshot), 5 * 60000); },
};
