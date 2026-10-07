import { z } from 'zod';
import { guildRoute, enqueueJob, audit } from '@/lib/api';
export const POST = guildRoute(z.object({ kind: z.enum(['weekly', 'monthly']) }), async ({ guildId, uid, body }) => { await enqueueJob(guildId, 'staff:postReport', body); await audit(guildId, uid, 'staff.report.send', body); return { ok: true }; });
