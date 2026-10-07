import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, enqueueJob, audit } from '@/lib/api';
import { bot } from '@/lib/discord';
import { tzOf, localDay, addDays } from '@/lib/insightsUtil';
// Churn alert list + subscriptions about to expire / lapsed. Mirrors bot/modules/insights/lib/retention.js.
export const GET = guildRoute(null, async ({ guildId }) => {
  const g: any = await prisma.guild.findUnique({ where: { id: guildId } }); const days = g?.settings?.insights?.churnDays || 7; const tz = await tzOf(guildId); const now = Date.now();
  const cands = await prisma.memberActivity.findMany({ where: { guildId, leftAt: null, lastMessageAt: { gt: new Date(now - 30 * 86400000), lte: new Date(now - days * 86400000) } }, orderBy: { lastMessageAt: 'desc' }, take: 500 });
  const grp = cands.length ? await prisma.memberDay.groupBy({ by: ['userId'], where: { guildId, userId: { in: cands.map((c) => c.userId) }, day: { gte: addDays(localDay(now, tz), -30) } }, _count: true }) : []; const cnt = new Map(grp.map((x) => [x.userId, x._count]));
  const churn = cands.filter((c) => (cnt.get(c.userId) || 0) >= 3).slice(0, 100); const names: Record<string, string> = {}; await Promise.all(churn.slice(0, 40).map(async (c) => { try { const u = await bot(`/users/${c.userId}`); names[c.userId] = u.global_name || u.username; } catch { /* id fallback */ } }));
  const subs = await prisma.subscription.findMany({ where: { guildId, OR: [{ removedAt: null, expiresAt: { gt: new Date(now), lte: new Date(now + 3 * 86400000) } }, { expiresAt: { lte: new Date(now), gt: new Date(now - 30 * 86400000) } }] }, orderBy: { expiresAt: 'asc' }, take: 200 });
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: subs.map((s) => s.orderId) } }, select: { orderId: true, productName: true } });
  return { churnDays: days, churn: churn.map((c) => ({ userId: c.userId, name: names[c.userId] || c.userId, lastMessageAt: c.lastMessageAt, activeDays: cnt.get(c.userId) })), subscriptions: subs.map((s) => ({ id: s.id, userId: s.userId, expiresAt: s.expiresAt, state: +s.expiresAt > now ? 'expiring' : 'lapsed', product: items.find((i) => i.orderId === s.orderId)?.productName || '—', reminded: s.remindedAt, canRenew: !!s.packageId })) };
});
export const POST = guildRoute(z.object({ subscriptionId: z.string().max(40) }), async ({ guildId, uid, body }) => {
  const s = await prisma.subscription.findFirst({ where: { id: body.subscriptionId, guildId } }); if (!s) throw new Error('الاشتراك غير موجود'); if (!s.packageId) throw new Error('لا توجد باقة مرتبطة بهذا الاشتراك لإنشاء طلب تجديد');
  await enqueueJob(guildId, 'insights:renewReminder', { subscriptionId: s.id }); await audit(guildId, uid, 'insights.renew.send', { subscriptionId: s.id }); return { ok: true };
});
