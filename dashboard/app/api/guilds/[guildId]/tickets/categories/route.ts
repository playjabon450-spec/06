import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
import { categorySchema } from '@/lib/ticketSchemas';
export const GET = guildRoute(null, async ({ guildId }) => ({ categories: await prisma.ticketCategory.findMany({ where: { guildId }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }) }));
export const POST = guildRoute(categorySchema, async ({ guildId, uid, body }) => {
  const { id, ...d } = body; const data = { ...d, parentId: d.parentId ?? null, firstResponseMin: d.firstResponseMin ?? null, resolutionMin: d.resolutionMin ?? null, escalationRoleId: d.escalationRoleId ?? null };
  if (id) { const r = await prisma.ticketCategory.updateMany({ where: { id, guildId }, data }); if (!r.count) throw new Error('القسم غير موجود'); } else {
    if ((await prisma.ticketCategory.count({ where: { guildId } })) >= 25) throw new Error('الحد الأقصى 25 قسماً'); await prisma.ticketCategory.create({ data: { ...data, guildId } as any }); }
  await bumpConfig(guildId); await audit(guildId, uid, id ? 'tickets.category.update' : 'tickets.category.create', { name: d.name }); return { ok: true };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => {
  const id = new URL(req.url).searchParams.get('id') || ''; if (await prisma.ticket.count({ where: { guildId, categoryId: id, status: 'open' } })) throw new Error('توجد تذاكر مفتوحة في هذا القسم، عطّله بدلاً من الحذف');
  await prisma.ticketCategory.deleteMany({ where: { id, guildId } }); await audit(guildId, uid, 'tickets.category.delete', { id }); return { ok: true };
});
