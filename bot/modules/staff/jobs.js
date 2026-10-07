const R = require('./lib/report');
module.exports = { // Job "staff:postReport" {kind: weekly|monthly}: "send now" from the dashboard.
  async postReport(ctx, job) { await R.postReport(ctx, job.guildId, job.payload.kind === 'monthly' ? 'monthly' : 'weekly'); },
};
