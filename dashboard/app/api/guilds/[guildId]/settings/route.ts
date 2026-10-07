import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
const id = z.string().regex(/^\d{5,25}$/);
const kinds = ['general', 'orders', 'tickets', 'shield', 'staff'] as const;
const schema = z.object({
  staffRoleIds: z.array(id).max(50), dashboardRoleIds: z.array(id).max(50),
  logChannels: z.record(z.enum(kinds), id.nullable()),
  modules: z.record(z.string().max(30), z.boolean()),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), timezone: z.string().max(50),
});
export const GET = guildRoute(null, async ({ guildId }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); const s = g.settings || {};
  return { staffRoleIds: g.staffRoleIds, dashboardRoleIds: s.dashboardRoleIds || [], logChannels: s.logChannels || {}, modules: g.modules || {}, themeColor: s.themeColor || '#1f6f8b', timezone: s.timezone || 'Africa/Cairo' };
});
export const PUT = guildRoute(schema, async ({ guildId, uid, body }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  const { staffRoleIds, modules, ...rest } = body;
  await prisma.guild.update({ where: { id: guildId }, data: { staffRoleIds, modules, settings: { ...(g.settings || {}), ...rest } } });
  await bumpConfig(guildId); await audit(guildId, uid, 'settings.update', { keys: Object.keys(body) }); return { ok: true };
});
