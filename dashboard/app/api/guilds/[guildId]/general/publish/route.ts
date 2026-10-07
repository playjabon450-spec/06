import { z } from 'zod';
import { guildRoute, enqueueJob, audit } from '@/lib/api';
export const POST = guildRoute(z.object({ module: z.string().max(40), panel: z.string().max(40), channelId: z.string().regex(/^\d{5,25}$/) }),
  async ({ guildId, uid, body }) => { await enqueueJob(guildId, 'general:publishPanel', body); await audit(guildId, uid, 'panel.publish', body); return { ok: true }; });
