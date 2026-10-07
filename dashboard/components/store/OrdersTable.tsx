'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Btn, useNotice } from './ui';
export const STATUS: Record<string, string> = { draft: 'مسودة', awaiting_payment: 'بانتظار الدفع', awaiting_confirmation: 'بانتظار التأكيد', paid: 'مدفوع', delivered: 'تم التسليم', cancelled: 'ملغي', refunded: 'مسترد', expired: 'منتهي' };
const color: Record<string, string> = { paid: 'bg-blue-100 text-blue-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-gray-200', refunded: 'bg-orange-100 text-orange-800', expired: 'bg-gray-200', awaiting_payment: 'bg-yellow-100 text-yellow-800', awaiting_confirmation: 'bg-yellow-100 text-yellow-800', draft: 'bg-gray-100' };
export default function OrdersTable({ guildId }: { guildId: string }) {
  const base = `/api/guilds/${guildId}/orders`; const [f, setF] = useState({ status: '', product: '', method: '', from: '', to: '', q: '' }); const [page, setPage] = useState(1);
  const [d, setD] = useState<any>({ orders: [], total: 0, pages: 1, methods: [], products: [] }); const [sel, setSel] = useState<any>(null); const [st, setSt] = useState(''); const [reason, setReason] = useState(''); const nt = useNotice();
  const qs = (p = page) => new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(p) }).toString();
  const load = (p = page) => api(`${base}?${qs(p)}`).then(setD).catch(nt.err);
  useEffect(() => { load(1); setPage(1); }, [f.status, f.product, f.method, f.from, f.to]); useEffect(() => { load(page); }, [page]);
  const mname = (id: string) => d.methods.find((m: any) => m.id === id)?.name || '—';
  async function change() { try { await api(base, 'PATCH', { id: sel.id, status: st, reason }); nt.ok('تم تغيير الحالة وتسجيلها'); setSel(null); setReason(''); load(); } catch (e) { nt.err(e); } }
  const sf = (k: string, v: string) => setF({ ...f, [k]: v });
  return <div className="space-y-3">
    <div className="bg-white border rounded-lg p-3 grid md:grid-cols-6 gap-2">
      <Field label="الحالة"><select className={inp} value={f.status} onChange={(e) => sf('status', e.target.value)}><option value="">الكل</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="المنتج"><select className={inp} value={f.product} onChange={(e) => sf('product', e.target.value)}><option value="">الكل</option>{d.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="طريقة الدفع"><select className={inp} value={f.method} onChange={(e) => sf('method', e.target.value)}><option value="">الكل</option>{d.methods.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="من تاريخ"><input type="date" className={inp} value={f.from} onChange={(e) => sf('from', e.target.value)} /></Field>
      <Field label="إلى تاريخ"><input type="date" className={inp} value={f.to} onChange={(e) => sf('to', e.target.value)} /></Field>
      <Field label="رقم الطلب / ID العميل"><input className={inp} value={f.q} onChange={(e) => sf('q', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} /></Field></div>
    <div className="flex justify-between items-center"><span className="text-sm">{d.total} طلب</span><a className="bg-sea text-white px-3 py-1.5 rounded text-sm" href={`${base}/export?${qs(1)}`}>تصدير CSV</a></div>{nt.view}
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['#', 'العميل', 'المنتج', 'الإجمالي', 'الدفع', 'الحالة', 'التاريخ'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{d.orders.map((o: any) => <tr key={o.id} className="border-t hover:bg-sand/40 cursor-pointer" onClick={() => { setSel(o); setSt(o.status); setReason(''); nt.clear(); }}>
        <td className="p-2 font-bold">#{o.number}</td><td className="p-2 font-mono text-xs" dir="ltr">{o.userId}</td><td className="p-2">{o.items.map((i: any) => `${i.productName} (${i.packageName})`).join('، ') || '—'}</td>
        <td className="p-2">{o.total} {o.currency === 'EGP' ? 'ج' : o.currency}</td><td className="p-2">{mname(o.methodId)}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${color[o.status]}`}>{STATUS[o.status]}</span></td>
        <td className="p-2 text-xs">{new Date(o.createdAt).toLocaleString('ar-EG')}</td></tr>)}
        {!d.orders.length && <tr><td colSpan={7} className="p-6 text-center text-gray-500">لا توجد طلبات</td></tr>}</tbody></table></div>
    <div className="flex gap-2 justify-center items-center"><Btn kind="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Btn><span className="text-sm">{page} / {d.pages}</span><Btn kind="ghost" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>التالي</Btn></div>
    {sel && <div className="fixed inset-0 bg-black/40 z-50 flex justify-start" onClick={() => setSel(null)}><aside className="bg-white w-full max-w-md h-full overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between"><h2 className="font-bold text-lg">طلب #{sel.number}</h2><button onClick={() => setSel(null)}>✕</button></div>
      <dl className="text-sm space-y-1"><div>العميل: <span className="font-mono" dir="ltr">{sel.userId}</span></div><div>الحالة: {STATUS[sel.status]}</div><div>طريقة الدفع: {mname(sel.methodId)}</div>
        <div>المجموع: {sel.subtotal} · الخصم: {sel.discount}{sel.couponCode ? ` (${sel.couponCode})` : ''} · الرسوم: {sel.fee} · <b>الإجمالي: {sel.total}</b></div>
        <div>أُنشئ: {new Date(sel.createdAt).toLocaleString('ar-EG')}</div>{sel.paidAt && <div>دُفع: {new Date(sel.paidAt).toLocaleString('ar-EG')}</div>}{sel.rating && <div>التقييم: {'⭐'.repeat(sel.rating)}</div>}</dl>
      <h3 className="font-bold">العناصر</h3>{sel.items.map((i: any) => <div key={i.id} className="text-sm">{i.productName} — {i.packageName} ({i.unitPrice} × {i.qty})</div>)}
      {Object.keys(sel.answers || {}).length > 0 && <><h3 className="font-bold">إجابات العميل</h3>{Object.entries(sel.answers).map(([k, v]) => <div key={k} className="text-sm"><b>{k}:</b> {String(v)}</div>)}</>}
      {sel.payments.length > 0 && <><h3 className="font-bold">الدفعات</h3>{sel.payments.map((p: any) => <div key={p.id} className="text-sm border rounded p-2">{p.amount} · {p.status}{p.confirmedBy && <> · أكّدها <span dir="ltr">{p.confirmedBy}</span></>}{p.receiptUrl && <> · <a className="text-blue-600 underline" target="_blank" rel="noreferrer" href={p.receiptUrl}>الإيصال</a></>}</div>)}</>}
      <hr /><h3 className="font-bold">تغيير الحالة يدوياً</h3>
      <select className={inp} value={st} onChange={(e) => setSt(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input className={inp} placeholder="السبب (إجباري، يُسجَّل في السجل)" value={reason} onChange={(e) => setReason(e.target.value)} />{nt.view}
      <Btn disabled={st === sel.status || reason.trim().length < 3} onClick={change}>تأكيد التغيير</Btn></aside></div>}
  </div>;
}
