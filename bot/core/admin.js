// Owner controls: blacklist (guild/user) + maintenance mode. Cached 15 s; DB errors never block the bot.
const prisma = require('./db'); const log = require('./logger');
const OWNERS = new Set((process.env.OWNER_IDS || process.env.BOT_OWNER_ID || '').split(',').map((s) => s.trim()).filter(Boolean));
let cache = { at: 0, maintenance: false, users: new Set(), guilds: new Set() };
async function load(force = false) {
  if (!force && Date.now() - cache.at < 15000) return cache;
  try { const [rows, m] = await Promise.all([prisma.blacklist.findMany({ select: { kind: true, targetId: true } }), prisma.botState.findUnique({ where: { key: 'maintenance' } })]);
    cache = { at: Date.now(), maintenance: !!m?.value?.enabled, users: new Set(rows.filter((r) => r.kind === 'user').map((r) => r.targetId)), guilds: new Set(rows.filter((r) => r.kind === 'guild').map((r) => r.targetId)) }; }
  catch (e) { log.warn('admin state load failed', e.message); cache.at = Date.now(); }
  return cache;
}
const isOwner = (id) => OWNERS.has(String(id));
// -> 'maintenance' | 'guild' | 'user' | null
async function blockReason(userId, guildId) { if (isOwner(userId)) return null; const c = await load(); if (c.maintenance) return 'maintenance'; if (guildId && c.guilds.has(guildId)) return 'guild'; if (c.users.has(userId)) return 'user'; return null; }
module.exports = { load, isOwner, blockReason };
