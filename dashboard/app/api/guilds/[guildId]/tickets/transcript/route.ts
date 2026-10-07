import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
// Returns the stored HTML transcript; the UI shows it inside a fully sandboxed iframe (no scripts).
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const id = new URL(req.url).searchParams.get('id') || ''; const t = await prisma.ticket.findFirst({ where: { id, guildId }, select: { number: true, transcript: true } }); if (!t?.transcript) throw new Error('لا يوجد سجل محفوظ لهذه التذكرة');
  return { number: t.number, html: t.transcript };
});
