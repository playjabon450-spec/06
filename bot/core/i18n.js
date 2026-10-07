const ar = require('../i18n/ar');
// cfg = object returned by config.get(); overrides win over defaults.
function t(cfg, key, vars = {}) {
  let s = (cfg && cfg.overrides && cfg.overrides[key]) ?? ar[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
module.exports = { t, defaults: ar };
