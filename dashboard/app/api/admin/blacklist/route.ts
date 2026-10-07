import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ownerRoute } from '@/lib/owner';
import { enqueueJob } from '@/lib/api';
const id = z.string().regex(/^\d{5,25}$/, 'المعرّف غير صالح');
export const POST = ownerRoute(z.object({ kind: z.enum(['guild', 'user']), targetId: id, reason: z.string().trim().max(200).default('') }), async ({ uid, body }) => {
  await prisma.blacklist.upsert({ where: { kind_targetId: { kind: body.kind, targetId: body.targetId } }, create: { ...body, by: uid }, update: { reason: body.reason, by: uid } });
  await prisma.auditLog.create({ data: { guildId: body.kind === 'guild' ? body.targetId : 'global', userId: uid, action: `admin.blacklist.${body.kind}`, details: body } });
  if (body.kind === 'guild') await enqueueJob(body.targetId, 'admin:leaveGuild', {}); // user entries are picked up by the bot's 15 s cache
  return { ok: true };
});
export const DELETE = ownerRoute(null, async ({ uid, req }) => {
  const sp = new URL(req.url).searchParams; const kind = sp.get('kind') || '', targetId = sp.get('targetId') || ''; if (!['guild', 'user'].includes(kind)) throw new Error('نوع غير صالح');
  await prisma.blacklist.deleteMany({ where: { kind, targetId } }); await prisma.auditLog.create({ data: { guildId: kind === 'guild' ? targetId : 'global', userId: uid, action: `admin.unblacklist.${kind}`, details: { targetId } } }); return { ok: true };
});
