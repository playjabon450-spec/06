const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const prisma = require('../../../core/db'); const config = require('../../../core/config'); const log = require('../../../core/logger'); const { t } = require('../../../core/i18n');
const stats = require('./stats'); const tz = require('./tz');
const DEFAULTS = { reportChannelId: null, supportChannelIds: [], weekly: { enabled: true, day: 6, hour: 9 }, monthly: { enabled: true, day: 1, hour: 9 }, inactivity: { enabled: false, days: 7 }, applications: { channelId: null, reviewChannelId: null, title: '', description: '', color: '#5865f2' } };
const of = (cfg) => { const s = cfg.guild.settings?.staff || {}; return { ...DEFAULTS, ...s, weekly: { ...DEFAULTS.weekly, ...(s.weekly || {}) }, monthly: { ...DEFAULTS.monthly, ...(s.monthly || {}) }, inactivity: { ...DEFAULTS.inactivity, ...(s.inactivity || {}) }, applications: { ...DEFAULTS.applications, ...(s.applications || {}) } }; };
const tzOf = (cfg) => cfg.guild.settings?.timezone || 'Africa/Cairo';
const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
function buildReport(cfg, kind, res, tzName) {
  const f = (d) => tz.parts(d, tzName).date; const rows = res.rows; const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const e = new EmbedBuilder().setColor(0x5865f2).setTitle(t(cfg, `staff.report.${kind}`)).setDescription(t(cfg, 'staff.report.range', { from: f(res.since), to: f(res.until) })).setTimestamp(res.until);
  if (!rows.length) return e.addFields({ name: '\u200b', value: t(cfg, 'staff.report.empty') });
  e.addFields({ name: t(cfg, 'staff.report.totals'), value: t(cfg, 'staff.report.totalsBody', { closed: sum('closed'), claimed: sum('claimed'), orders: sum('orders'), mod: sum('mod'), messages: sum('messages') }) });
  e.addFields({ name: t(cfg, 'staff.report.board'), value: rows.slice(0, 10).map((r, i) => t(cfg, 'staff.report.line', { medal: medal(i), user: r.userId, points: r.points, claimed: r.claimed, closed: r.closed, orders: r.orders, rating: r.avgRating ? ` · ⭐${r.avgRating}` : '' })).join('\n').slice(0, 1024) });
  const fr = rows.filter((r) => r.avgFirstResponse != null).sort((a, b) => a.avgFirstResponse - b.avgFirstResponse)[0]; if (fr) e.addFields({ name: t(cfg, 'staff.report.fastest'), value: `<@${fr.userId}> — ${fr.avgFirstResponse} د` });
  return e;
}
async function channelFor(client, cfg) { const s = of(cfg); const lc = cfg.guild.settings?.logChannels || {}; const id = s.reportChannelId || lc.staff || lc.general; const ch = id && (await client.channels.fetch(id).catch(() => null)); return ch?.isTextBased() ? ch : null; }
async function postReport({ client }, guildId, kind) {
  const cfg = await config.get(guildId); const days = kind === 'monthly' ? 30 : 7; const until = new Date(); const res = await stats.compute(prisma, guildId, new Date(+until - days * 86400000), until);
  const ch = await channelFor(client, cfg); if (!ch) return false; await ch.send({ embeds: [buildReport(cfg, kind, res, tzOf(cfg))], allowedMentions: { parse: [] } }); return true;
}
module.exports = { of, tzOf, buildReport, postReport, channelFor, DEFAULTS };
