import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
import { methodSchema } from '@/lib/storeSchemas';
export const GET = guildRoute(null, async ({ guildId }) => ({ methods: await prisma.paymentMethod.findMany({ where: { guildId }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }) }));
export const POST = guildRoute(methodSchema, async ({ guildId, uid, body }) => {
  const { id, ...data } = body;
  if (id) { const r = await prisma.paymentMethod.updateMany({ where: { id, guildId }, data }); if (!r.count) throw new Error('طريقة الدفع غير موجودة'); }
  else await prisma.paymentMethod.create({ data: { ...data, guildId } as any });
  await bumpConfig(guildId); await audit(guildId, uid, id ? 'store.method.update' : 'store.method.create', { name: data.name, kind: data.kind }); return { ok: true };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (await prisma.order.count({ where: { guildId, methodId: id, status: { in: ['awaiting_payment', 'awaiting_confirmation'] } } })) throw new Error('توجد طلبات مفتوحة بهذه الطريقة، عطّلها بدلاً من الحذف');
  await prisma.paymentMethod.deleteMany({ where: { id, guildId } }); await bumpConfig(guildId); await audit(guildId, uid, 'store.method.delete', { id }); return { ok: true };
});
