const f = (l) => (...a) => console[l === 'error' ? 'error' : 'log'](new Date().toISOString(), `[${l}]`, ...a);
let _client = null;
const log = { info: f('info'), warn: f('warn'), error: f('error'), init: (c) => { _client = c; } };
// log.channel(guildId, kind, embed): kind = general|orders|tickets|shield|staff. Never throws.
log.channel = async (guildId, kind, embed) => {
  try {
    const cfg = await require('./config').get(guildId); const lc = cfg.guild.settings?.logChannels || {};
    const id = lc[kind] || lc.general; if (!id || !_client) return false;
    const ch = await _client.channels.fetch(id).catch(() => null);
    if (!ch?.isTextBased()) return false;
    await ch.send({ embeds: [embed] }); return true;
  } catch (e) { log.warn('log.channel failed', kind, e.message); return false; }
};
module.exports = log;
