const { reply, cooldown } = require('./guard'); const log = require('./logger'); const config = require('./config'); const { t } = require('./i18n'); const admin = require('./admin');
// custom_id: "<module>:<action>:<id>[:<extra>]"
module.exports = (ctx) => async (ix) => {
  if (!(ix.isButton() || ix.isAnySelectMenu() || ix.isModalSubmit())) return;
  const [mod, action, ...rest] = ix.customId.split(':');
  const m = ctx.modules.get(mod); if (!m) return;
  const blocked = await admin.blockReason(ix.user.id, ix.guildId); if (blocked) return reply(ix, t(null, `admin.${blocked}`)); // maintenance / blacklist (owner bypasses)
  // DM interactions (e.g. renewal button in a reminder DM) are only allowed for actions a module lists in dmActions.
  if (!ix.guildId) { if (!m.dmActions?.includes(action) || !cooldown(ix.user.id, ix.customId)) return; try { await m.handlers[action](ix, rest, ctx); } catch (e) { log.error('dm interaction failed', ix.customId, e); reply(ix, t(null, 'core.error')); } return; }
  let cfg;
  try {
    cfg = await config.get(ix.guildId);
    if (!config.enabled(cfg, mod, m.defaultEnabled)) return reply(ix, t(cfg, 'core.moduleDisabled'));
    if (!cooldown(ix.user.id, ix.customId)) return reply(ix, t(cfg, 'core.cooldown'));
    const h = m.handlers[action]; if (!h) return reply(ix, t(cfg, 'core.unknownAction'));
    await h(ix, rest, { ...ctx, cfg, tr: (k, v) => t(cfg, k, v) });
  } catch (e) { log.error('interaction failed', ix.customId, e); reply(ix, t(cfg, 'core.error')); }
};
