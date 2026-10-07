import { prisma } from '@/lib/prisma';
import { guildRoute, audit } from '@/lib/api';
import { couponSchema } from '@/lib/storeSchemas';
export const GET = guildRoute(null, async ({ guildId }) => {
  const [coupons, products] = await Promise.all([prisma.coupon.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' } }), prisma.product.findMany({ where: { guildId }, select: { id: true, name: true } })]);
  return { coupons, products };
});
export const POST = guildRoute(couponSchema, async ({ guildId, uid, body }) => {
  const { id, expiresAt, ...d } = body; const data = { ...d, expiresAt: expiresAt ? new Date(expiresAt) : null, maxUses: d.maxUses ?? null, maxPerUser: d.maxPerUser ?? null };
  try {
    if (id) { const r = await prisma.coupon.updateMany({ where: { id, guildId }, data }); if (!r.count) throw new Error('الكوبون غير موجود'); }
    else await prisma.coupon.create({ data: { ...data, guildId } });
  } catch (e: any) { if (e.code === 'P2002') throw new Error('هذا الكود مستخدم بالفعل'); throw e; }
  await audit(guildId, uid, id ? 'store.coupon.update' : 'store.coupon.create', { code: d.code }); return { ok: true };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => {
  const id = new URL(req.url).searchParams.get('id') || ''; await prisma.coupon.deleteMany({ where: { id, guildId } }); await audit(guildId, uid, 'store.coupon.delete', { id }); return { ok: true };
});
