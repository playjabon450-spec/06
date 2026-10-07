import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, audit } from '@/lib/api';
import { bot } from '@/lib/discord';
const id = /^\d{5,25}$/;
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const userId = new URL(req.url).searchParams.get('userId') || ''; if (!id.test(userId)) throw new Error('أدخل معرّف عضو صحيح');
  const [member, user] = await Promise.all([bot(`/guilds/${guildId}/members/${userId}`).catch(() => null), bot(`/users/${userId}`).catch(() => null)]);
  const [incidents, notes, orders, tickets, appeals] = await Promise.all([prisma.shieldIncident.findMany({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, take: 50 }), prisma.memberNote.findMany({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.order.findMany({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, number: true, status: true, total: true, currency: true, createdAt: true } }),
    prisma.ticket.findMany({ where: { guildId, userId }, orderBy: { openedAt: 'desc' }, take: 50, select: { id: true, number: true, status: true, openedAt: true } }), prisma.banAppeal.findMany({ where: { guildId, userId }, orderBy: { createdAt: 'desc' }, take: 20 })]);
  const timeline = [...incidents.map((i) => ({ at: i.createdAt, type: 'incident', text: `حادثة: ${i.kind} — ${i.action}` })), ...notes.map((n) => ({ at: n.createdAt, type: 'note', text: `ملاحظة: ${n.text}` })), ...orders.map((o) => ({ at: o.createdAt, type: 'order', text: `طلب #${o.number} (${o.status}) — ${o.total} ${o.currency}` })),
    ...tickets.map((t) => ({ at: t.openedAt, type: 'ticket', text: `تذكرة #${t.number} (${t.status})` })), ...appeals.map((a) => ({ at: a.createdAt, type: 'appeal', text: `استئناف حظر (${a.status})` })), ...(member?.joined_at ? [{ at: new Date(member.joined_at), type: 'join', text: 'انضم للسيرفر' }] : [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const paid = orders.filter((o) => ['paid', 'delivered'].includes(o.status));
  return { userId, found: !!user, inGuild: !!member, username: user?.global_name || user?.username || userId, avatar: user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=64` : null, joinedAt: member?.joined_at || null, roles: member?.roles?.length || 0,
    counts: { incidents: incidents.length, orders: paid.length, spent: paid.reduce((a, o) => a + o.total, 0), tickets: tickets.length, appeals: appeals.length }, notes, timeline: timeline.slice(0, 100) };
});
export const POST = guildRoute(z.object({ userId: z.string().regex(id), text: z.string().trim().min(1).max(500) }), async ({ guildId, uid, body }) => { await prisma.memberNote.create({ data: { guildId, userId: body.userId, authorId: uid, text: body.text } }); await audit(guildId, uid, 'shield.note', { target: body.userId }); return { ok: true }; });
export const DELETE = guildRoute(null, async ({ guildId, uid, req }) => { const nid = new URL(req.url).searchParams.get('id') || ''; await prisma.memberNote.deleteMany({ where: { id: nid, guildId } }); await audit(guildId, uid, 'shield.note.delete', { id: nid }); return { ok: true }; });
