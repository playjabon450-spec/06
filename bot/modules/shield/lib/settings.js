const DEFAULTS = {
  linkBlock: { enabled: true, action: 'delete', timeoutMinutes: 60, exemptRoleIds: [], customDomains: [], allowDomains: [] },
  compromised: { enabled: true, sensitivity: 'medium', cooldownMin: 10, quarantineRoleId: null },
  raid: { enabled: false, joins: 8, seconds: 30, newAccountDays: 30, lockdownChannelIds: [], autoEndMinutes: 30, gateDays: 0, gateAction: 'timeout' },
  appeals: { enabled: false, intro: '' },
};
const of = (cfg) => { const s = cfg.guild.settings?.shield || {}; return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, { ...DEFAULTS[k], ...(s[k] || {}) }])); };
module.exports = { DEFAULTS, of };
