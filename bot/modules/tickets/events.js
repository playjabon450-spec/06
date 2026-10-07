const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../../core/db'); const log = require('../../core/logger'); const config = require('../../core/config'); const ai = require('../../core/ai'); const { t } = require('../../core/i18n');
const T = require('./lib/tickets'); const kb = require('./lib/kb'); const sla = require('./lib/sla');
const guarded = (fn, name) => () => Promise.resolve(fn()).catch((e) => log.warn(name + ' failed', e.message));

// First customer message: smart routing (optional AI) then knowledge-base answer.
async function firstMessage(ctx, tk, cat, cfg, msg) {
  const s = T.settingsOf(cfg); const text = msg.content?.slice(0, 1500) || ''; if (!text) return;
  if (s.aiRouting) {
    const cats = await prisma.ticketCategory.findMany({ where: { guildId: tk.guildId, active: true }, orderBy: { sortOrder: 'asc' }, take: 20 });
    const out = cats.length && (await ai.generate(tk.guildId, `صنّف رسالة العميل. الأقسام:\n${cats.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}\nأعد JSON فقط بالشكل {"category":رقم,"priority":"low|normal|high|urgent"}.\nالرسالة: ${text}`, { maxTokens: 60 }));
    try { const j = out && JSON.parse(out.replace(/```json|```/g, '').trim()); const nc = cats[Number(j?.category) - 1]; const pr = T.PRIOS.includes(j?.priority) ? j.priority : tk.priority;
      if (nc || pr !== tk.priority) { if (nc && nc.id !== tk.categoryId) await T.applyCategory(ctx.client, tk, nc, cfg); await prisma.ticket.update({ where: { id: tk.id }, data: { priority: pr } }); await T.refreshMain(ctx.client, tk.id);
        await msg.channel.send({ content: t(cfg, 'tickets.routing.note', { category: (nc || cat)?.name || '—', priority: t(cfg, `tickets.prio.${pr}`) }) }); } } catch { /* AI unavailable or bad JSON: fall back silently */ }
  }
  if (!s.kbEnabled) return;
  const arts = await prisma.kbArticle.findMany({ where: { guildId: tk.guildId, active: true }, take: 200 }); if (!arts.length) return;
  let hit = kb.match(text, arts)?.article || null;
  if (!hit) { // optional free AI semantic match (quota-limited)
    const list = arts.slice(0, 30).map((a, i) => `${i + 1}. ${a.question}`).join('\n'); const out = await ai.generate(tk.guildId, `أي سؤال من القائمة يطابق مشكلة العميل؟ أجب برقم فقط أو 0 إن لم يوجد.\n${list}\nمشكلة العميل: ${text}`, { maxTokens: 8 });
    const n = out && parseInt(out.replace(/\D/g, ''), 10); if (n > 0) hit = arts[n - 1] || null;
  }
  if (!hit) return;
  await prisma.kbArticle.update({ where: { id: hit.id }, data: { hits: { increment: 1 } } }); await prisma.ticket.update({ where: { id: tk.id }, data: { kbArticleId: hit.id } });
  const e = new EmbedBuilder().setColor(0xf1c40f).setTitle(t(cfg, 'tickets.kb.title')).setDescription(`**${hit.question}**\n\n${hit.answer}${hit.attachments?.length ? '\n\n' + hit.attachments.join('\n') : ''}`.slice(0, 4000)).setFooter({ text: t(cfg, 'tickets.kb.footer') });
  await msg.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(T.btn(`tickets:kbsolved:${tk.id}`, t(cfg, 'tickets.btn.solved'), ButtonStyle.Success), T.btn(`tickets:kbstaff:${tk.id}`, t(cfg, 'tickets.btn.staff'), ButtonStyle.Primary))] });
}
async function sweepSla(ctx) {
  const now = Date.now(); const open = await prisma.ticket.findMany({ where: { status: 'open', channelId: { not: null } }, take: 500 }); if (!open.length) return;
  const cats = new Map((await prisma.ticketCategory.findMany({ where: { id: { in: [...new Set(open.map((x) => x.categoryId).filter(Boolean))] } } })).map((c) => [c.id, c]));
  for (const tk of open) {
    try {
      const cat = cats.get(tk.categoryId); const cfg = await config.get(tk.guildId); const s = T.settingsOf(cfg); const ch = await ctx.client.channels.fetch(tk.channelId).catch(() => null); if (!ch) continue;
      const ev = sla.evaluate(tk, cat, now); const fire = sla.due(ev, tk.sla || {});
      if (fire.length) {
        const flags = { ...(tk.sla || {}) }; fire.forEach((f) => (flags[f] = true)); await prisma.ticket.update({ where: { id: tk.id }, data: { sla: flags } });
        for (const f of fire) {
          const breach = f.endsWith('Breach'); const esc = cat?.escalationRoleId || s.escalationRoleId; const roles = breach && esc ? [esc] : T.roleIds(cfg, cat); const pct = Math.round((f.startsWith('fr') ? ev.fr : ev.res) * 100);
          const text = t(cfg, `tickets.sla.${f}`, { number: tk.number, pct, roles: roles.map((r) => `<@&${r}>`).join(' ') });
          await ch.send({ content: text, allowedMentions: { roles } }).catch(() => null); if (breach) await log.channel(tk.guildId, 'tickets', new EmbedBuilder().setColor(0xe74c3c).setDescription(`${text}\n<#${tk.channelId}>`));
        }
      }
      if (!tk.claimedBy && s.unclaimedMin) { const since = Math.max(+tk.openedAt, tk.lastRemindAt ? +tk.lastRemindAt : 0); if (now - since >= s.unclaimedMin * 60000) { await prisma.ticket.update({ where: { id: tk.id }, data: { lastRemindAt: new Date() } }); await ch.send({ content: t(cfg, 'tickets.unclaimedRemind', { number: tk.number, min: Math.round((now - +tk.openedAt) / 60000), roles: T.pings(cfg, cat) }), allowedMentions: { roles: T.roleIds(cfg, cat) } }).catch(() => null); } }
    } catch (e) { log.warn('sla sweep', tk.id, e.message); }
  }
}
// Delete closed ticket channels after the configured retention.
async function sweepClosed(ctx) {
  for (const tk of await prisma.ticket.findMany({ where: { status: 'closed', channelId: { not: null }, closedAt: { lte: new Date(Date.now() - 3600000) } }, take: 100 })) {
    const cfg = await config.get(tk.guildId); const h = T.settingsOf(cfg).closeDeleteHours; if (Date.now() - +tk.closedAt < h * 3600000) continue;
    const ch = await ctx.client.channels.fetch(tk.channelId).catch(() => null); await ch?.delete('ticket retention').catch(() => null); await prisma.ticket.update({ where: { id: tk.id }, data: { channelId: null } });
  }
}
let started = false;
module.exports = {
  ready: async (ctx) => { if (started) return; started = true; setInterval(guarded(() => sweepSla(ctx), 'slaSweep'), 60000); setInterval(guarded(() => sweepClosed(ctx), 'closedSweep'), 600000); },
  messageCreate: async (ctx, msg) => {
    try {
      const topic = msg.channel?.topic; if (!msg.guildId || msg.author.bot || !topic?.startsWith('ticket:')) return;
      const tk = await prisma.ticket.findFirst({ where: { id: topic.slice(7), channelId: msg.channelId, status: 'open' } }); if (!tk) return; const cat = await T.getCat(tk.categoryId); const cfg = await config.get(msg.guildId); if (!config.enabled(cfg, 'tickets', true)) return;
      if (msg.author.id === tk.userId) {
        if (tk.pausedAt) await prisma.ticket.update({ where: { id: tk.id }, data: { pausedMs: { increment: Date.now() - +tk.pausedAt }, pausedAt: null } }); // customer replied: SLA resumes
        if ((await prisma.ticket.updateMany({ where: { id: tk.id, kbChecked: false }, data: { kbChecked: true } })).count) await firstMessage(ctx, tk, cat, cfg, msg);
      } else if (await T.isStaffFor(msg.member, msg.guildId, cat)) {
        const fr = await prisma.ticket.updateMany({ where: { id: tk.id, firstResponseAt: null }, data: { firstResponseAt: new Date() } });
        if (fr.count) await prisma.staffEvent.create({ data: { guildId: tk.guildId, userId: msg.author.id, kind: 'first_response', value: Math.round(((Date.now() - +tk.openedAt) / 60000) * 10) / 10 } }).catch(() => null); // feeds staff stats (Step 6)
        if (!tk.pausedAt) await prisma.ticket.update({ where: { id: tk.id }, data: { pausedAt: new Date() } }); // waiting for the customer: SLA paused
      }
    } catch (e) { log.error('tickets messageCreate', e); }
  },
};
