import { prisma } from '@/lib/prisma';
import { guildRoute, audit } from '@/lib/api';
import { kbSchema } from '@/lib/ticketSchemas';
export const GET = guildRoute(null, async ({ guildId }) => {
  const articles = await prisma.kbArticle.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' } });
  const hits = articles.reduce((a, x) => a + x.hits, 0), resolved = articles.reduce((a, x) => a + x.resolved, 0);
  return { articles, totals: { hits, resolved, rate: hits ? Math.round((resolved / hits) * 100) : 0 } };
});
export const POST = guildRoute(kbSchema, async ({ guildId, uid, body }) => {
  const { id, ...data } = body;
  if (id) { const r = await prisma.kbArticle.updateMany({ where: { id, guildId }, data }); if (!r.count) throw new Error('المقال غير موجود'); } else await prisma.kbArticle.create({ data: { ...data, guildId } });
  await audit(guildId, uid, id ? 'tickets.kb.update' : 'tickets.kb.create', { question: data.question }); return { ok: true };
});
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => { const id = new URL(req.url).searchParams.get('id') || ''; await prisma.kbArticle.deleteMany({ where: { id, guildId } }); await audit(guildId, uid, 'tickets.kb.delete', { id }); return { ok: true }; });
