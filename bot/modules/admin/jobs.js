const admin = require('../../core/admin');
module.exports = { // "admin:leaveGuild" {} — job.guildId is the target guild (enqueued by the owner panel)
  async leaveGuild({ client }, job) { const g = await client.guilds.fetch(job.guildId).catch(() => null); if (g) await g.leave(); await admin.load(true); },
  async refresh() { await admin.load(true); },
};
