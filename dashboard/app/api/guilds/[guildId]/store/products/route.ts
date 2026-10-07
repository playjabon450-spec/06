import { prisma } from '@/lib/prisma';
import { guildRoute, audit, enqueueJob } from '@/lib/api';
import { productSchema } from '@/lib/storeSchemas';
export const GET = guildRoute(null, async ({ guildId }) => {
  const products = await prisma.product.findMany({ where: { guildId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { packages: { orderBy: { sortOrder: 'asc' } }, questions: { orderBy: { sortOrder: 'asc' } } } });
  const g = await prisma.stockKey.groupBy({ by: ['productId', 'used'], where: { guildId }, _count: true });
  const methods = await prisma.paymentMethod.findMany({ where: { guildId }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, kind: true } });
  return { methods, products: products.map((p) => ({ ...p, keysAvailable: g.find((x) => x.productId === p.id && !x.used)?._count || 0, keysUsed: g.find((x) => x.productId === p.id && x.used)?._count || 0 })) };
});
export const POST = guildRoute(productSchema, async ({ guildId, uid, body }) => {
  const { packages, questions, id, ...data } = body;
  const pid = await prisma.$transaction(async (tx) => {
    let productId = id;
    if (id) { const ex = await tx.product.findFirst({ where: { id, guildId } }); if (!ex) throw new Error('المنتج غير موجود'); await tx.product.update({ where: { id }, data }); }
    else productId = (await tx.product.create({ data: { ...data, guildId } })).id;
    const keepP = packages.filter((p) => p.id).map((p) => p.id as string), keepQ = questions.filter((q) => q.id).map((q) => q.id as string);
    await tx.package.deleteMany({ where: { productId, id: { notIn: keepP } } }); await tx.productQuestion.deleteMany({ where: { productId, id: { notIn: keepQ } } });
    for (const p of packages) { const { id: x, ...d } = p; const row = { ...d, priceUsd: d.priceUsd ?? null, durationDays: d.durationDays ?? null, badge: d.badge || null };
      if (x && (await tx.package.count({ where: { id: x, productId } }))) await tx.package.update({ where: { id: x }, data: row }); else await tx.package.create({ data: { ...row, productId } }); }
    for (const q of questions) { const { id: x, ...d } = q;
      if (x && (await tx.productQuestion.count({ where: { id: x, productId } }))) await tx.productQuestion.update({ where: { id: x }, data: d }); else await tx.productQuestion.create({ data: { ...d, productId } }); }
    return productId as string;
  });
  await audit(guildId, uid, id ? 'store.product.update' : 'store.product.create', { id: pid, name: data.name });
  await enqueueJob(guildId, 'store:checkLowStock', {}); // bot re-evaluates stock alerts right away
  return { ok: true, id: pid };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  const r = await prisma.product.deleteMany({ where: { id, guildId } }); if (!r.count) throw new Error('المنتج غير موجود');
  await audit(guildId, uid, 'store.product.delete', { id }); return { ok: true };
});
