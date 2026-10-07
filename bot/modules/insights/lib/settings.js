const DEFAULTS = { digestChannelId: null, digestDm: false, weekly: { enabled: true, day: 6, hour: 10 }, churnDays: 7, aiSummary: { enabled: false, channelIds: [], postChannelId: null, cap: 3, hour: 22 } };
const of = (cfg) => { const s = cfg.guild.settings?.insights || {}; return { ...DEFAULTS, ...s, weekly: { ...DEFAULTS.weekly, ...(s.weekly || {}) }, aiSummary: { ...DEFAULTS.aiSummary, ...(s.aiSummary || {}) } }; };
const tzOf = (cfg) => cfg.guild.settings?.timezone || 'Africa/Cairo';
module.exports = { DEFAULTS, of, tzOf };
