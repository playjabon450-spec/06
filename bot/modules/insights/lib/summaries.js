const { EmbedBuilder } = require('discord.js'); const prisma = require('../../../core/db'); const ai = require('../../../core/ai'); const log = require('../../../core/logger'); const { claim } = require('../../../core/guard'); const { t } = require('../../../core/i18n'); const tracker = require('./tracker'); const S = require('./settings');
// Optional: one Arabic summary per toggled channel per day, hard-capped (settings.aiSummary.cap, max 10). Message text only lives in memory.
async function run({ client }, guildId, cfg, day) {
  const a = S.of(cfg).aiSummary; if (!a.enabled || !a.channelIds.length) return 0; const cap = Math.min(10, Math.max(1, a.cap)); let done = await prisma.aiSummary.count({ where: { guildId, day } }); let n = 0;
  const lc = cfg.guild.settings?.logChannels || {}; const post = a.postChannelId || S.of(cfg).digestChannelId || lc.general; const out = post && (await client.channels.fetch(post).catch(() => null));
  for (const cid of a.channelIds) {
    if (done >= cap) break; const msgs = tracker.takeSamples(guildId, cid); if (msgs.length < 15) continue; if (!(await claim(prisma, `insights-ai:${guildId}:${day}:${cid}`))) continue;
    const text = await ai.generate(guildId, `لخّص أبرز مواضيع النقاش في قناة ديسكورد اليوم في 4 نقاط عربية قصيرة، دون ذكر أسماء أشخاص. الرسائل:\n${msgs.join('\n')}`.slice(0, 7000), { maxTokens: 350 }); if (!text) continue; // quota exhausted/disabled -> silent
    await prisma.aiSummary.create({ data: { guildId, day, channelId: cid, text: text.slice(0, 2000) } }).catch(() => null); done++; n++;
    if (out?.isTextBased()) await out.send({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle(t(cfg, 'insights.ai.title', { day, channel: cid })).setDescription(text.slice(0, 2000))], allowedMentions: { parse: [] } }).catch(() => null);
  }
  return n;
}
module.exports = { run };
