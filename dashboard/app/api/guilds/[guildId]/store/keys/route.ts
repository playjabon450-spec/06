import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, audit, enqueueJob } from '@/lib/api';
// Bulk key inventory. Textarea/CSV: one key per line (first CSV column is used). Duplicates are skipped (DB unique + in-batch dedupe).
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const productId = new URL(req.url).searchParams.get('productId') || '';
  const keys = await prisma.stockKey.findMany({ where: { guildId, productId }, orderBy: [{ used: 'asc' }, { createdAt: 'desc' }], take: 300, select: { id: true, value: true, used: true, usedByOrder: true, usedAt: true } });
  return { keys };
});
export const POST = guildRoute(z.object({ productId: z.string().max(40), text: z.string().max(500_000) }), async ({ guildId, uid, body }) => {
  const p = await prisma.product.findFirst({ where: { id: body.productId, guildId } }); if (!p) throw new Error('المنتج غير موجود');
  const lines = body.text.split(/\r?\n/).map((l) => l.split(',')[0].trim().replace(/^"|"$/g, '')).filter(Boolean);
  const uniq = Array.from(new Set(lines)).filter((v) => v.length <= 500); if (uniq.length > 5000) throw new Error('الحد الأقصى 5000 مفتاح في المرة');
  const r = await prisma.stockKey.createMany({ data: uniq.map((value) => ({ guildId, productId: p.id, value })), skipDuplicates: true });
  await audit(guildId, uid, 'store.keys.add', { productId: p.id, added: r.count });
  await enqueueJob(guildId, 'store:checkLowStock', {});
  return { added: r.count, duplicates: lines.length - r.count };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  const r = await prisma.stockKey.deleteMany({ where: { id, guildId, used: false } }); if (!r.count) throw new Error('لا يمكن حذف مفتاح مُستخدم');
  await audit(guildId, uid, 'store.keys.delete', { id }); return { ok: true };
});
