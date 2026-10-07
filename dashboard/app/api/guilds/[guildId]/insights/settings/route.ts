import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, enqueueJob, audit } from '@/lib/api';
const snow = z.string().regex(/^\d{5,25}$/);
const schema = z.object({ digestChannelId: snow.nullable(), digestDm: z.boolean(), weekly: z.object({ enabled: z.boolean(), day: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23) }), churnDays: z.number().int().min(2).max(29),
  aiSummary: z.object({ enabled: z.boolean(), channelIds: z.array(snow).max(10), postChannelId: snow.nullable(), cap: z.number().int().min(1).max(10), hour: z.number().int().min(0).max(23) }) });
const DEFAULTS = { digestChannelId: null, digestDm: false, weekly: { enabled: true, day: 6, hour: 10 }, churnDays: 7, aiSummary: { enabled: false, channelIds: [], postChannelId: null, cap: 3, hour: 22 } };
export const GET = guildRoute(null, async ({ guildId }) => { const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); const s = g.settings?.insights || {}; return { ...DEFAULTS, ...s, weekly: { ...DEFAULTS.weekly, ...(s.weekly || {}) }, aiSummary: { ...DEFAULTS.aiSummary, ...(s.aiSummary || {}) }, timezone: g.settings?.timezone || 'Africa/Cairo' }; });
export const PUT = guildRoute(schema, async ({ guildId, uid, body }) => { const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); await prisma.guild.update({ where: { id: guildId }, data: { settings: { ...(g.settings || {}), insights: body } } }); await bumpConfig(guildId); await audit(guildId, uid, 'insights.settings.update', {}); return { ok: true }; });
// "Send digest now" / "re-aggregate yesterday"
export const POST = guildRoute(z.object({ action: z.enum(['digest', 'aggregate']) }), async ({ guildId, uid, body }) => { await enqueueJob(guildId, body.action === 'digest' ? 'insights:digest' : 'insights:aggregate', {}); await audit(guildId, uid, `insights.${body.action}`, {}); return { ok: true }; });
