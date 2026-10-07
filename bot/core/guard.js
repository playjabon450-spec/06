const { PermissionFlagsBits } = require('discord.js');
const hits = new Map();
// Per-user per-customId cooldown (ms).
function cooldown(uid, id, ms = 1500) {
  const k = uid + id, n = Date.now();
  if ((hits.get(k) || 0) > n) return false;
  hits.set(k, n + ms);
  if (hits.size > 5000) for (const [kk, v] of hits) if (v < n) hits.delete(kk);
  return true;
}
const isStaff = (member, cfg) => !!member && (member.permissions.has(PermissionFlagsBits.Administrator) || cfg.guild.staffRoleIds.some((r) => member.roles.cache.has(r)));
async function reply(ix, content) {
  try {
    const o = { content, ephemeral: true };
    if (ix.deferred || ix.replied) await ix.followUp(o); else await ix.reply(o);
  } catch {}
}
// Idempotency: returns true only the first time a key is claimed.
async function claim(prisma, key) {
  try { await prisma.idempotencyKey.create({ data: { key } }); return true; }
  catch (e) { if (e.code === 'P2002') return false; throw e; }
}
module.exports = { cooldown, isStaff, reply, claim };
