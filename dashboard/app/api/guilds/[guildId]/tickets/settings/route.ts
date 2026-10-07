import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
import { ticketSettingsSchema, defaultTicketSettings } from '@/lib/ticketSchemas';
export const GET = guildRoute(null, async ({ guildId }) => { const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); return { ...defaultTicketSettings, ...(g.settings?.tickets || {}) }; });
export const PUT = guildRoute(ticketSettingsSchema, async ({ guildId, uid, body }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  await prisma.guild.update({ where: { id: guildId }, data: { settings: { ...(g.settings || {}), tickets: body } } }); await bumpConfig(guildId); await audit(guildId, uid, 'tickets.settings.update', {}); return { ok: true };
});
