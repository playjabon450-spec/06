import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManage } from '@/lib/api';
import { orderWhere, loadOrders } from '@/lib/orderQuery';
const esc = (v: any) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }; // blocks CSV formula injection
export async function GET(req: Request, { params }: { params: { guildId: string } }) {
  const session: any = await getServerSession(authOptions);
  if (!session || !(await canManage(session, params.guildId))) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const orders = await loadOrders(orderWhere(params.guildId, new URL(req.url).searchParams), 5000);
  const head = ['رقم الطلب', 'العميل', 'الحالة', 'المنتجات', 'الإجمالي', 'الخصم', 'الكوبون', 'طريقة الدفع', 'تاريخ الإنشاء', 'تاريخ الدفع'];
  const rows = orders.map((o) => [o.number, o.userId, o.status, o.items.map((i) => `${i.productName} - ${i.packageName}`).join(' | '), o.total, o.discount, o.couponCode, o.methodId, o.createdAt.toISOString(), o.paidAt?.toISOString()]);
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders.csv"' } });
}
