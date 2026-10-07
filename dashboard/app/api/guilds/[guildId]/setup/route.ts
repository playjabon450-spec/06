import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
// First-run checklist: derived from real data, so it stays correct even if the owner configures things from other pages.
export const GET = guildRoute(null, async ({ guildId }) => {
  const g: any = await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} }); const lc = g.settings?.logChannels || {};
  const [methods, products, panels, cats] = await Promise.all([prisma.paymentMethod.count({ where: { guildId, active: true } }), prisma.product.count({ where: { guildId, active: true, packages: { some: { active: true } } } }), prisma.panel.findMany({ where: { guildId, key: { in: ['store:order', 'tickets:main'] } }, select: { key: true } }), prisma.ticketCategory.count({ where: { guildId, active: true } })]);
  const steps = [
    { key: 'roles', title: 'رتب الستاف', desc: 'حدّد الرتب التي تملك صلاحية تأكيد الدفع وإدارة التذاكر (الأدمن مسموح له دائماً).', done: (g.staffRoleIds || []).length > 0, href: null },
    { key: 'logs', title: 'قنوات السجلات', desc: 'اختر على الأقل القناة العامة وقناة الطلبات لتصلك التنبيهات والسجلات.', done: Object.values(lc).some(Boolean) && !!(lc.general || lc.orders), href: null },
    { key: 'payments', title: 'طرق الدفع', desc: 'فعّل طريقة دفع واحدة على الأقل (فودافون كاش / كريديت / عملة مخصصة).', done: methods > 0, href: '/payments' },
    { key: 'product', title: 'أول منتج', desc: 'أضف منتجاً مفعّلاً بباقة واحدة على الأقل وحدّد طريقة تسليمه.', done: products > 0, href: '/store' },
    { key: 'storePanel', title: 'نشر لوحة المتجر', desc: 'اختر قناة المتجر ثم اضغط «حفظ + نشر» من تبويب «لوحة المتجر والإعدادات».', done: panels.some((p) => p.key === 'store:order'), href: '/store' },
    { key: 'ticketPanel', title: 'نشر لوحة التذاكر', desc: `أضف قسماً واحداً على الأقل${cats ? ' (تم ✓)' : ''} ثم انشر اللوحة من تبويب «اللوحة والإعدادات».`, done: panels.some((p) => p.key === 'tickets:main'), href: '/tickets' },
  ];
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
});
