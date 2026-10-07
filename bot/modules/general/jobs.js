// Job "general:publishPanel" payload: { module, panel, channelId }. Posts or edits the panel message.
module.exports = {
  async publishPanel({ client, prisma, modules }, job) {
    const { module: mod, panel, channelId } = job.payload;
    const build = modules.get(mod)?.panels?.[panel]; if (!build) throw new Error('لوحة غير معروفة');
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) throw new Error('القناة غير موجودة أو محذوفة');
    const key = `${mod}:${panel}`; const payload = await build(job.cfg); // panels may be async (e.g. tickets reads categories from DB)
    const row = await prisma.panel.findUnique({ where: { guildId_key: { guildId: job.guildId, key } } });
    let msg = null;
    if (row?.messageId && row.channelId === channelId) msg = await ch.messages.fetch(row.messageId).catch(() => null);
    msg = msg ? await msg.edit(payload) : await ch.send(payload).catch((e) => { throw new Error('لا أملك صلاحية الإرسال في هذه القناة (' + e.code + ')'); });
    await prisma.panel.upsert({ where: { guildId_key: { guildId: job.guildId, key } }, create: { guildId: job.guildId, key, channelId, messageId: msg.id }, update: { channelId, messageId: msg.id } });
  },
};
