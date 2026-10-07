import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, audit, enqueueJob } from '@/lib/api';
import { orderWhere, loadOrders } from '@/lib/orderQuery';
const PAGE = 25;
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const sp = new URL(req.url).searchParams; const page = Math.max(1, Number(sp.get('page')) || 1); const where = orderWhere(guildId, sp);
  const [orders, total, methods, products] = await Promise.all([loadOrders(where, PAGE, (page - 1) * PAGE), prisma.order.count({ where }),
    prisma.paymentMethod.findMany({ where: { guildId }, select: { id: true, name: true } }), prisma.product.findMany({ where: { guildId }, select: { id: true, name: true } })]);
  return { orders, total, pages: Math.max(1, Math.ceil(total / PAGE)), methods, products };
});
const S = ['draft', 'awaiting_payment', 'awaiting_confirmation', 'paid', 'delivered', 'cancelled', 'refunded', 'expired'] as const;
// Manual status change (audit-logged). Delivery/role/key reversal is performed by the bot in Step 3 via the same job.
export const PATCH = guildRoute(z.object({ id: z.string().max(40), status: z.enum(S), reason: z.string().trim().min(3).max(300) }), async ({ guildId, uid, body }) => {
  const o = await prisma.order.findFirst({ where: { id: body.id, guildId } }); if (!o) throw new Error('الطلب غير موجود');
  if (o.status === body.status) throw new Error('الطلب بهذه الحالة بالفعل');
  await prisma.order.update({ where: { id: o.id }, data: { status: body.status, ...(body.status === 'paid' && !o.paidAt ? { paidAt: new Date() } : {}), ...(body.status === 'delivered' ? { deliveredAt: new Date() } : {}) } });
  await audit(guildId, uid, 'store.order.status', { orderId: o.id, number: o.number, from: o.status, to: body.status, reason: body.reason });
  await enqueueJob(guildId, 'store:orderStatusChanged', { orderId: o.id, from: o.status, to: body.status, by: uid, reason: body.reason });
  return { ok: true };
});
