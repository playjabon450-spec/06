// Pure link analysis: extraction, homoglyph normalisation, blocklist/lookalike checks. No network here (see expandShort for the only fetch).
const HOMO = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'ο': 'o', 'ν': 'v', 'α': 'a', 'ρ': 'p', 'ι': 'i', 'ѵ': 'v', 'ӏ': 'l', 'ո': 'n', 'ս': 'u', 'һ': 'h', 'ԍ': 'g', 'ɑ': 'a', 'ⅼ': 'l', 'ǃ': 'i' };
const BRANDS = ['discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net', 'discord.gift', 'discord.media', 'steamcommunity.com', 'steampowered.com', 'roblox.com', 'paypal.com', 'epicgames.com', 'twitch.tv', 'binance.com', 'instagram.com', 'facebook.com', 'tiktok.com'];
const BRAND_WORDS = ['discord', 'steam', 'roblox', 'paypal', 'epicgames', 'binance'];
const BAIT = /(nitro|gift|free|airdrop|promo|verify|claim|drop|giveaway|app|support|login)/;
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'rb.gy', 'shorturl.at', 't.ly', 'goo.gl', 'ow.ly', 'buff.ly', 'rebrand.ly', 'tiny.cc', 'v.gd']);
const TLDS = 'com|net|org|gg|gift|gifts|xyz|top|site|online|click|link|live|icu|shop|store|ru|tk|cf|ml|ga|gq|co|io|me|app|club|info|biz|cc|ws|pw';
const deob = (s) => String(s).replace(/\[\.\]|\(\.\)|\(dot\)|\[dot\]/gi, '.').replace(/hxxp/gi, 'http');
// Returns { host, homoglyph } — lowercase, no www, confusable letters mapped to latin; homoglyph=true only when the mapped host is pure ascii (a spoof).
function normalizeHost(h) {
  let s = String(h).normalize('NFKC').toLowerCase().replace(/\.$/, ''); let homoglyph = false;
  s = [...s].map((c) => { if (HOMO[c]) { homoglyph = true; return HOMO[c]; } return c; }).join('');
  if (!/^[\x00-\x7f]+$/.test(s)) homoglyph = false; // genuinely non-latin domains (e.g. Arabic/Russian IDN) are not "spoofs"; only fully-latin-after-mapping hosts are
  try { s = new URL('http://' + s).hostname; } catch { /* keep */ }
  return { host: s.replace(/^www\./, ''), homoglyph };
}
function extractHosts(text) {
  const t = deob(text); const out = new Set(); const re = new RegExp(`(?:https?:\\/\\/|www\\.)[^\\s<>"'\`)\\]]+|\\b(?:[\\p{L}\\p{N}-]+\\.)+(?:${TLDS})\\b(?:\\/[^\\s<>"'\`)]*)?`, 'giu');
  for (const m of t.matchAll(re)) { let u = m[0].replace(/^https?:\/\//i, '').replace(/^\/\//, ''); u = u.split(/[\/?#]/)[0].split('@').pop().split(':')[0]; if (u.includes('.')) out.add(u); }
  return [...out].map(normalizeHost);
}
const reg = (host) => host.split('.').slice(-2).join('.');
function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 3; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
// Lookalike/brand-abuse detection. -> reason string or null.
function lookalike(host) {
  const r = reg(host); if (BRANDS.includes(r)) return null;
  for (const b of BRANDS) { if (host.endsWith('.' + b) === false && (host.startsWith(b + '.') || host.includes('.' + b + '.'))) return 'brand_in_subdomain'; }
  for (const b of BRANDS) { const d = lev(r, b); if (d >= 1 && d <= (b.length >= 10 ? 2 : 1)) return 'typosquat'; }
  const name = r.split('.')[0]; for (const w of BRAND_WORDS) if (name.includes(w) && BAIT.test(name.replace(w, ''))) return 'brand_word'; // e.g. discord-nitro.xyz (plain steamdb.info / discord.me are fine)
  return null;
}
// Blocklist hit on host or any parent domain.
function listed(host, set) { const p = host.split('.'); for (let i = 0; i < p.length - 1; i++) if (set.has(p.slice(i).join('.'))) return true; return false; }
// -> { kind: 'blocklist'|'custom'|'lookalike'|'homoglyph', host, reason? } | null
function classify(h, { blocked, custom = [], allow = [] }) {
  const host = h.host; if (allow.some((a) => host === a || host.endsWith('.' + a))) return null;
  if (custom.some((c) => host === c || host.endsWith('.' + c))) return { kind: 'custom', host };
  if (blocked && listed(host, blocked)) return { kind: 'blocklist', host };
  const la = lookalike(host); if (la) return { kind: 'lookalike', host, reason: la };
  if (h.homoglyph) return { kind: 'homoglyph', host };
  return null;
}
const isShortener = (host) => SHORTENERS.has(host);
// Expands a known shortener by following up to 3 redirects. ONLY known shortener hosts are ever requested (SSRF-safe).
async function expandShort(host, text, fetchImpl = fetch) {
  if (!isShortener(host)) return null;
  const urlIn = new RegExp(`https?:\\/\\/(?:www\\.)?${host.replace(/\./g, '\\.')}[^\\s<>]*`, 'i').exec(text); if (!urlIn) return null; let url = urlIn[0];
  for (let i = 0; i < 3; i++) {
    const h = normalizeHost(new URL(url).hostname).host; if (!isShortener(h)) return h;
    const r = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(3000) }).catch(() => null); const loc = r?.headers?.get?.('location'); if (!loc) return null; url = new URL(loc, url).toString();
  }
  return null;
}
// Full scan of a message. -> first hit or null. expand: async (host,text)=>host|null
async function scan(text, ctx, expand = expandShort) {
  for (const h of extractHosts(text)) {
    let hit = classify(h, ctx); if (hit) return hit;
    if (isShortener(h.host)) { const real = await expand(h.host, deob(text)).catch(() => null); if (real) { hit = classify(normalizeHost(real), ctx); if (hit) return { ...hit, via: h.host }; } }
  }
  return null;
}
module.exports = { normalizeHost, extractHosts, lookalike, classify, listed, scan, isShortener, expandShort, BRANDS, lev, reg };
