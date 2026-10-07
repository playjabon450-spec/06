// Auto-discovers bot/modules/<name>/{index,buttons,events,jobs}.js
const fs = require('fs'); const path = require('path'); const log = require('./logger');
function loadModules() {
  const dir = path.join(__dirname, '../modules'); const mods = new Map();
  for (const name of fs.readdirSync(dir)) {
    const base = path.join(dir, name);
    if (!fs.existsSync(path.join(base, 'index.js'))) continue;
    try {
      const opt = (f) => (fs.existsSync(path.join(base, f)) ? require(path.join(base, f)) : {});
      const meta = require(base);
      mods.set(meta.name || name, { name: meta.name || name, defaultEnabled: meta.defaultEnabled !== false, panels: meta.panels || {}, dmActions: meta.dmActions || [], handlers: opt('buttons.js'), events: opt('events.js'), jobs: opt('jobs.js') });
      log.info('module loaded:', name);
    } catch (e) { log.error('module failed:', name, e); }
  }
  return mods;
}
module.exports = { loadModules };
