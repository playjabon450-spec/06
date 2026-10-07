import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, enqueueJob, audit } from '@/lib/api';
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const status = new URL(req.url).searchParams.get('status') || ''; return { appeals: await prisma.banAppeal.findMany({ where: { guildId, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 }) };
});
// Staff decision from the dashboard. The bot applies it (unban + DM + updates the staff card) via a job; the DB transition is atomic so the staff-channel buttons and this path can never both win.
export const PATCH = guildRoute(z.object({ id: z.string().max(40), decision: z.enum(['accepted', 'rejected']), reason: z.string().trim().max(300).default('') }).refine((b) => b.decision === 'accepted' || b.reason.length >= 3, { message: 'اكتب سبب الرفض' }), async ({ guildId, uid, body }) => {
  const a = await prisma.banAppeal.findFirst({ where: { id: body.id, guildId } }); if (!a) throw new Error('الاستئناف غير موجود'); if (a.status !== 'pending') throw new Error('تم البتّ في هذا الاستئناف بالفعل');
  await enqueueJob(guildId, 'shield:appealDecision', { appealId: a.id, decision: body.decision, reason: body.reason, by: uid }); await audit(guildId, uid, 'shield.appeal.review', { appealId: a.id, decision: body.decision }); return { ok: true };
});
