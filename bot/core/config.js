// Per-guild config cache. Refreshes within CONFIG_POLL_MS when the dashboard bumps configVersion.
const prisma = require('./db'); const log = require('./logger');
const cache = new Map();
async function load(id) {
  const guild = await prisma.guild.upsert({ where: { id }, create: { id }, update: {} });
  const rows = await prisma.messageOverride.findMany({ where: { guildId: id } });
  const c = { guild, version: guild.configVersion, overrides: Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  cache.set(id, c); return c;
}
const get = async (id) => cache.get(id) || load(id);
const enabled = (cfg, mod, def = true) => cfg.guild.modules?.[mod] ?? def;
const isPremium = (cfg) => !!cfg.guild.premium;
// Feature gate helper. Premium is NOT enforced yet: returns true unless STRICT_PREMIUM is set.
const allowFeature = (cfg, premiumOnly) => !premiumOnly || isPremium(cfg) || !process.env.STRICT_PREMIUM;
function startPolling(ms) {
  setInterval(async () => {
    try {
      const rows = await prisma.guild.findMany({ select: { id: true, configVersion: true } });
      for (const r of rows) { const c = cache.get(r.id); if (c && c.version !== r.configVersion) await load(r.id); }
    } catch (e) { log.warn('config poll failed', e.message); }
  }, ms);
}
module.exports = { get, enabled, isPremium, allowFeature, startPolling };
