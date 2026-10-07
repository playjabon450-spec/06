import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, audit } from '@/lib/api';
const snow = z.string().regex(/^\d{5,25}$/);
const schema = z.object({ id: z.string().max(40).optional(), name: z.string().trim().min(1).max(60), description: z.string().max(500).default(''), buttonLabel: z.string().trim().min(1).max(80).default('قدّم الآن'),
  questions: z.array(z.object({ label: z.string().trim().min(1).max(45), type: z.enum(['short', 'long', 'number', 'select']), required: z.boolean(), options: z.array(z.string().trim().min(1).max(80)).max(25) })).min(1, 'أضف سؤالاً واحداً على الأقل').max(25),
  roleId: snow.nullable().optional(), minVotes: z.number().int().min(0).max(50), cooldownDays: z.number().int().min(0).max(365), active: z.boolean(), sortOrder: z.number().int().min(0).max(999) })
  .superRefine((f, c) => f.questions.forEach((q, i) => { if (q.type === 'select' && q.options.length < 2) c.addIssue({ code: 'custom', message: 'قائمة الاختيار تحتاج خيارين على الأقل', path: ['questions', i] }); }));
export const GET = guildRoute(null, async ({ guildId }) => ({ forms: await prisma.applicationForm.findMany({ where: { guildId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }) }));
export const POST = guildRoute(schema, async ({ guildId, uid, body }) => {
  const { id, ...d } = body; const data = { ...d, roleId: d.roleId ?? null };
  if (id) { const r = await prisma.applicationForm.updateMany({ where: { id, guildId }, data }); if (!r.count) throw new Error('الاستمارة غير موجودة'); } else { if ((await prisma.applicationForm.count({ where: { guildId } })) >= 10) throw new Error('الحد الأقصى 10 استمارات'); await prisma.applicationForm.create({ data: { ...data, guildId } as any }); }
  await audit(guildId, uid, id ? 'staff.form.update' : 'staff.form.create', { name: d.name }); return { ok: true };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => { const id = new URL(req.url).searchParams.get('id') || ''; if (await prisma.application.count({ where: { guildId, formId: id, status: 'pending' } })) throw new Error('توجد طلبات قيد المراجعة على هذه الاستمارة، عطّلها بدلاً من الحذف'); await prisma.applicationForm.deleteMany({ where: { id, guildId } }); await audit(guildId, uid, 'staff.form.delete', { id }); return { ok: true }; });
