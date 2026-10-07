import { prisma } from './prisma';
export function orderWhere(guildId: string, sp: URLSearchParams) {
  const w: any = { guildId }; const g = (k: string) => sp.get(k) || '';
  if (g('status')) w.status = g('status'); if (g('method')) w.methodId = g('method'); if (g('product')) w.items = { some: { productId: g('product') } };
  const from = g('from') ? new Date(g('from')) : null, to = g('to') ? new Date(g('to') + 'T23:59:59.999Z') : null;
  if ((from && !isNaN(+from)) || (to && !isNaN(+to))) w.createdAt = { ...(from && !isNaN(+from) ? { gte: from } : {}), ...(to && !isNaN(+to) ? { lte: to } : {}) };
  const q = g('q').replace('#', ''); if (/^\d+$/.test(q)) w.OR = [{ number: Number(q) }, { userId: q }];
  return w;
}
export const loadOrders = (where: any, take: number, skip = 0) => prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { items: true, payments: true } });
