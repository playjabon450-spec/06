import { z } from 'zod';
import { ownerRoute } from '@/lib/owner';
import { enqueueJob } from '@/lib/api';
import { prisma } from '@/lib/prisma';
export const POST = ownerRoute(z.object({ action: z.literal('leave'), guildId: z.string().regex(/^\d{5,25}$/) }), async ({ uid, body }) => { await enqueueJob(body.guildId, 'admin:leaveGuild', {}); await prisma.auditLog.create({ data: { guildId: body.guildId, userId: uid, action: 'admin.leave', details: {} } }); return { ok: true }; });
