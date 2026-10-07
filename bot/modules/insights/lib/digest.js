const { EmbedBuilder } = require('discord.js'); const prisma = require('../../../core/db'); const config = require('../../../core/config'); const log = require('../../../core/logger'); const { t } = require('../../../core/i18n');
const D = require('./days'); const H = require('./health'); const R = require('./retention'); const S = require('./settings');
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0); const pct = (a, b) => (b ? `${a >= b ? '▲' : '▼'}${Math.abs(Math.round(((a - b) / b) * 100))}%` : '—'); const num = (n) => Math.round(n * 100) / 100;
// Weekly digest data (last 7 full local days vs the 7 before).
async function collect(db, guildId, cfg) {
  const tz = S.tzOf(cfg); const today = D.local(Date.now(), tz).day; const to = D.addDays(today, -1), from = D.addDays(today, -7);
  const [cur, prev, since28] = await Promise.all([db.analyticsDaily.findMany({ where: { guildId, day: { gte: from, lte: to } }, orderBy: { day: 'asc' } }), db.analyticsDaily.findMany({ where: { guildId, day: { gte: D.addDays(today, -14), lt: from } } }), db.insightsMsg.findMany({ where: { guildId, day: { gte: D.addDays(today, -28) } } })]);
  const chan = {}; cur.forEach((r) => Object.entries(r.byChannel || {}).forEach(([c, n]) => (chan[c] = (chan[c] || 0) + n))); const prod = {}; cur.forEach((r) => Object.entries(r.revenueByProduct || {}).forEach(([p, v]) => (prod[p] = (prod[p] || 0) + v)));
  const peak = H.bestTimes(since28.map((m) => ({ weekday: D.weekday(m.day), hour: m.hour, count: m.count })), 3); const paid = sum(cur, (r) => r.paidOrders), orders = sum(cur, (r) => r.orders), revenue = sum(cur, (r) => r.revenue);
  const churn = await R.churnList(db, guildId, S.of(cfg).churnDays, tz); const subs = await R.subscriptions(db, guildId); const last = cur[cur.length - 1];
  return { from, to, members: last?.members || 0, joined: sum(cur, (r) => r.joined), left: sum(cur, (r) => r.left), pJoined: sum(prev, (r) => r.joined), pLeft: sum(prev, (r) => r.left), messages: sum(cur, (r) => r.messages), pMessages: sum(prev, (r) => r.messages),
    activeAvg: Math.round(sum(cur, (r) => r.activeMembers) / Math.max(1, cur.length)), peak, topChannels: Object.entries(chan).sort((a, b) => b[1] - a[1]).slice(0, 5), revenue: num(revenue), pRevenue: num(sum(prev, (r) => r.revenue)), paid, orders, aov: paid ? num(revenue / paid) : 0,
    bestProduct: Object.entries(prod).sort((a, b) => b[1] - a[1])[0]?.[0] || null, ticketsOpened: sum(cur, (r) => r.ticketsOpened), ticketsClosed: sum(cur, (r) => r.ticketsClosed), shield: sum(cur, (r) => r.shieldIncidents), health: last?.health || null, churn: churn.length,
    expiring: subs.filter((s) => s.state === 'expiring').length, lapsed: subs.filter((s) => s.state === 'lapsed').length, hasStore: orders > 0 || revenue > 0 || (await db.product.count({ where: { guildId } })) > 0, hasTickets: (await db.ticketCategory.count({ where: { guildId } })) > 0 };
}
function embed(cfg, d, avgRating) {
  const e = new EmbedBuilder().setColor(0x3498db).setTitle(t(cfg, 'insights.digest.title')).setDescription(t(cfg, 'insights.digest.range', { from: d.from, to: d.to })).setTimestamp();
  e.addFields({ name: t(cfg, 'insights.digest.members'), value: t(cfg, 'insights.digest.membersBody', { total: d.members, joined: d.joined, dj: pct(d.joined, d.pJoined), left: d.left, dl: pct(d.left, d.pLeft), net: d.joined - d.left }) },
    { name: t(cfg, 'insights.digest.activity'), value: t(cfg, 'insights.digest.activityBody', { messages: d.messages, dm: pct(d.messages, d.pMessages), active: d.activeAvg }) },
    { name: t(cfg, 'insights.digest.peak'), value: d.peak.map((p) => `${H.WD[p.weekday]} ${H.hourLabel(p.hour)}`).join(' · ') || t(cfg, 'insights.digest.none'), inline: true }, { name: t(cfg, 'insights.digest.channels'), value: d.topChannels.map(([c, n]) => `<#${c}> — ${n}`).join('\n') || t(cfg, 'insights.digest.none'), inline: true });
  if (d.hasStore) e.addFields({ name: t(cfg, 'insights.digest.revenue'), value: t(cfg, 'insights.digest.revenueBody', { revenue: d.revenue, dr: pct(d.revenue, d.pRevenue), best: d.bestProduct || t(cfg, 'insights.digest.none'), aov: d.aov, conv: d.orders ? Math.round((d.paid / d.orders) * 100) : 0, paid: d.paid, orders: d.orders }) });
  if (d.hasTickets) e.addFields({ name: t(cfg, 'insights.digest.tickets'), value: t(cfg, 'insights.digest.ticketsBody', { opened: d.ticketsOpened, closed: d.ticketsClosed, rating: avgRating ? t(cfg, 'insights.digest.rating', { r: avgRating }) : '' }) });
  e.addFields({ name: t(cfg, 'insights.digest.shield'), value: t(cfg, 'insights.digest.shieldBody', { n: d.shield }), inline: true }, { name: t(cfg, 'insights.digest.churn'), value: t(cfg, 'insights.digest.churnBody', { n: d.churn, days: S.of(cfg).churnDays }), inline: true });
  if (d.expiring || d.lapsed) e.addFields({ name: t(cfg, 'insights.digest.subs'), value: t(cfg, 'insights.digest.subsBody', { expiring: d.expiring, lapsed: d.lapsed }) });
  if (d.health) e.addFields({ name: t(cfg, 'insights.digest.health'), value: t(cfg, 'insights.digest.healthBody', { score: d.health.score, level: d.health.level }) + '\n' + d.health.parts.map((p) => `• ${p.label}: ${p.score}/${p.max}`).join('\n') }, { name: t(cfg, 'insights.digest.tips'), value: d.health.tips.map((x, i) => `${i + 1}. ${x}`).join('\n').slice(0, 1024) });
  return e;
}
async function postDigest({ client }, guildId) {
  const cfg = await config.get(guildId); const s = S.of(cfg); const d = await collect(prisma, guildId, cfg);
  const rated = await prisma.ticket.findMany({ where: { guildId, rating: { not: null }, closedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, select: { rating: true } }); const avgRating = rated.length ? Math.round((rated.reduce((a, r) => a + r.rating, 0) / rated.length) * 10) / 10 : null;
  const e = embed(cfg, d, avgRating); const lc = cfg.guild.settings?.logChannels || {}; const id = s.digestChannelId || lc.staff || lc.general; const ch = id && (await client.channels.fetch(id).catch(() => null)); let sent = false;
  if (ch?.isTextBased()) sent = !!(await ch.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => null));
  if (s.digestDm) { try { const guild = await client.guilds.fetch(guildId); await (await guild.fetchOwner()).send({ embeds: [e] }); sent = true; } catch { log.info('digest DM closed'); } }
  await prisma.insightsDigest.upsert({ where: { guildId_weekKey: { guildId, weekKey: d.to } }, create: { guildId, weekKey: d.to, data: { ...d, avgRating } }, update: { data: { ...d, avgRating } } }).catch(() => null); return sent;
}
module.exports = { collect, embed, postDigest };
