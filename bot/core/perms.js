const { PermissionFlagsBits } = require('discord.js'); const config = require('./config'); const { reply } = require('./guard'); const { t } = require('./i18n');
// Staff = Administrator OR any role in Guild.staffRoleIds (set in dashboard settings).
async function isStaff(member, guildId) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const cfg = await config.get(guildId);
  return cfg.guild.staffRoleIds.some((r) => member.roles.cache.has(r));
}
// Use at the top of staff-only handlers: if (!(await perms.requireStaff(ix))) return;
async function requireStaff(ix) {
  if (await isStaff(ix.member, ix.guildId)) return true;
  await reply(ix, t(await config.get(ix.guildId), 'core.noPermission')); return false;
}
module.exports = { isStaff, requireStaff };
