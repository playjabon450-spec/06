import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
import { shieldSettingsSchema, defaultShield } from '@/lib/shieldSchemas';
export const GET = guildRoute(null, async ({ guildId }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); const s = g.settings?.shield || {};
  return Object.fromEntries(Object.entries(defaultShield).map(([k, v]) => [k, { ...v, ...(s[k] || {}) }]));
});
export const PUT = guildRoute(shieldSettingsSchema, async ({ guildId, uid, body }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  await prisma.guild.update({ where: { id: guildId }, data: { settings: { ...(g.settings || {}), shield: body } } }); await bumpConfig(guildId); await audit(guildId, uid, 'shield.settings.update', {}); return { ok: true };
});
