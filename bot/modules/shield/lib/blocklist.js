const prisma = require('../../../core/db'); const log = require('../../../core/logger'); const { normalizeHost, listed } = require('./links');
// Offline fallback (used when the daily download fails or before the first run).
const FALLBACK = ['dicsord.gift', 'discorde.gift', 'discordnitro.xyz', 'discord-app.xyz', 'discordgift.top', 'discord-gifts.com', 'nitro-discord.com', 'free-nitro.xyz', 'steamcommunlty.com', 'steamcomminuty.com', 'steamcornmunity.com', 'steam-nitro.com', 'discrod.gift', 'discordc.gift', 'dlscord-gift.com', 'discord-airdrop.com', 'robloxfreerobux.xyz', 'claim-nitro.top'];
const DEFAULT_URLS = ['https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json', 'https://raw.githubusercontent.com/Discord-AntiScam/scam-links/main/list.json'];
const set = new Set(FALLBACK); let updatedAt = null;
const valid = (d) => /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?\.[a-z0-9-]{2,}$/.test(d);
function parse(body) { // JSON array | {domains:[]} | plain text lines
  let list; try { const j = JSON.parse(body); list = Array.isArray(j) ? j : j.domains || j.list || []; } catch { list = String(body).split(/\r?\n/); }
  return list.map((x) => normalizeHost(String(x).trim().replace(/^#.*/, '')).host).filter(valid);
}
async function load() { try { for (const r of await prisma.shieldDomain.findMany({ select: { domain: true }, take: 200000 })) set.add(r.domain); } catch (e) { log.warn('blocklist load failed', e.message); } }
// Downloads open sources (SHIELD_BLOCKLIST_URLS overrides, comma separated), persists new domains. Never throws.
async function update() {
  const urls = (process.env.SHIELD_BLOCKLIST_URLS || '').split(',').map((s) => s.trim()).filter(Boolean); let added = 0;
  for (const url of urls.length ? urls : DEFAULT_URLS) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error('http ' + r.status); const domains = parse(await r.text()).slice(0, 150000); const fresh = domains.filter((d) => !set.has(d));
      for (let i = 0; i < fresh.length; i += 5000) await prisma.shieldDomain.createMany({ data: fresh.slice(i, i + 5000).map((domain) => ({ domain, source: url.slice(0, 120) })), skipDuplicates: true }); fresh.forEach((d) => set.add(d)); added += fresh.length; }
    catch (e) { log.warn('blocklist source failed', url, e.message); }
  }
  updatedAt = new Date(); log.info(`blocklist updated: +${added}, total ${set.size}`); return added;
}
module.exports = { set, load, update, parse, has: (host) => listed(host, set), size: () => set.size, updatedAt: () => updatedAt };
