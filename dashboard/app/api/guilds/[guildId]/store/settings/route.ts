import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
import { storeSettingsSchema, defaultStoreSettings } from '@/lib/storeSchemas';
// Stored in Guild.settings.store (merged, never overwrites other settings keys).
export const GET = guildRoute(null, async ({ guildId }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  return { ...defaultStoreSettings, ...(g.settings?.store || {}) };
});
export const PUT = guildRoute(storeSettingsSchema, async ({ guildId, uid, body }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  await prisma.guild.update({ where: { id: guildId }, data: { settings: { ...(g.settings || {}), store: body } } });
  await bumpConfig(guildId); await audit(guildId, uid, 'store.settings.update', {}); return { ok: true };
});
