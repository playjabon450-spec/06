const AP = require('./lib/appeals'); const bl = require('./lib/blocklist');
module.exports = {
  // Job "shield:newAppeal" {appealId}: enqueued by the public appeal API -> staff card.
  async newAppeal(ctx, job) { const a = await ctx.prisma.banAppeal.findUnique({ where: { id: job.payload.appealId } }); if (a && a.status === 'pending' && !a.messageId) await AP.post(ctx, job.cfg, a); },
  // Job "shield:appealDecision" {appealId, decision: accepted|rejected, reason, by}: enqueued by the dashboard review.
  async appealDecision(ctx, job) { const { appealId, decision, reason, by } = job.payload; await AP.decide(ctx, appealId, decision, reason, by); },
  // Job "shield:updateBlocklist" {}: manual refresh.
  async updateBlocklist() { await bl.update(); },
};
