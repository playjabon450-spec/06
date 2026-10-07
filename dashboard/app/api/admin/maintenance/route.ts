import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ownerRoute } from '@/lib/owner';
export const POST = ownerRoute(z.object({ enabled: z.boolean() }), async ({ uid, body }) => {
  const value = { enabled: body.enabled, by: uid, at: Date.now() };
  await prisma.botState.upsert({ where: { key: 'maintenance' }, create: { key: 'maintenance', value }, update: { value } });
  await prisma.auditLog.create({ data: { guildId: 'global', userId: uid, action: 'admin.maintenance', details: body } }); return { ok: true };
});
