'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Btn, useNotice } from '../store/ui';
const PR: any = { low: '🟢 منخفضة', normal: '🔵 عادية', high: '🟠 عالية', urgent: '🔴 عاجلة' };
export default function TicketsList({ guildId }: { guildId: string }) {
  const base = `/api/guilds/${guildId}/tickets`; const [f, setF] = useState({ status: '', category: '', priority: '', q: '' }); const [page, setPage] = useState(1); const [d, setD] = useState<any>({ tickets: [], pages: 1, total: 0, categories: [] });
  const [tr, setTr] = useState<any>(null); const [sel, setSel] = useState<any>(null); const nt = useNotice();
  const load = (p = page) => api(`${base}/list?${new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(p) })}`).then(setD).catch(nt.err);
  useEffect(() => { setPage(1); load(1); }, [f.status, f.category, f.priority]); useEffect(() => { load(page); }, [page]);
  const cname = (id: string) => d.categories.find((c: any) => c.id === id)?.name || '—'; const sf = (k: string, v: string) => setF({ ...f, [k]: v });
  async function view(t: any) { try { setTr(await api(`${base}/transcript?id=${t.id}`)); } catch (e) { nt.err(e); } }
  return <div className="space-y-3"><div className="bg-white border rounded-lg p-3 grid md:grid-cols-4 gap-2">
    <Field label="الحالة"><select className={inp} value={f.status} onChange={(e) => sf('status', e.target.value)}><option value="">الكل</option><option value="open">مفتوحة</option><option value="closed">مغلقة</option></select></Field>
    <Field label="القسم"><select className={inp} value={f.category} onChange={(e) => sf('category', e.target.value)}><option value="">الكل</option>{d.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="الأولوية"><select className={inp} value={f.priority} onChange={(e) => sf('priority', e.target.value)}><option value="">الكل</option>{Object.entries(PR).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}</select></Field>
    <Field label="رقم التذكرة / ID العميل"><input className={inp} value={f.q} onChange={(e) => sf('q', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} /></Field></div>{nt.view}
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['#', 'القسم', 'العميل', 'الأولوية', 'المستلم', 'الحالة', 'التقييم', 'SLA', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{d.tickets.map((t: any) => <tr key={t.id} className="border-t"><td className="p-2 font-bold">#{t.number}</td><td className="p-2">{cname(t.categoryId)}</td><td className="p-2 font-mono text-xs" dir="ltr">{t.userId}</td><td className="p-2">{PR[t.priority]}</td>
        <td className="p-2 font-mono text-xs" dir="ltr">{t.claimedBy || '—'}</td><td className="p-2">{t.status === 'open' ? '🟢 مفتوحة' : '🔴 مغلقة'}</td><td className="p-2">{t.rating ? '⭐'.repeat(t.rating) : '—'}</td><td className="p-2">{t.sla?.frBreach || t.sla?.resBreach ? '🚨' : '✅'}</td>
        <td className="p-2 flex gap-1"><Btn kind="ghost" onClick={() => setSel(t)}>تفاصيل</Btn>{t.status === 'closed' && <Btn kind="ghost" onClick={() => view(t)}>السجل</Btn>}</td></tr>)}{!d.tickets.length && <tr><td colSpan={9} className="p-6 text-center text-gray-500">لا توجد تذاكر</td></tr>}</tbody></table></div>
    <div className="flex gap-2 justify-center items-center"><Btn kind="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Btn><span className="text-sm">{page} / {d.pages}</span><Btn kind="ghost" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>التالي</Btn></div>
    {sel && <div className="fixed inset-0 bg-black/40 z-50 flex justify-start" onClick={() => setSel(null)}><aside className="bg-white w-full max-w-md h-full overflow-y-auto p-5 space-y-2 text-sm" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><h2 className="font-bold text-lg">تذكرة #{sel.number}</h2><button onClick={() => setSel(null)}>✕</button></div>
      <div>القسم: {cname(sel.categoryId)}</div><div>فُتحت: {new Date(sel.openedAt).toLocaleString('ar-EG')}</div>{sel.firstResponseAt && <div>أول رد بعد: {Math.round((+new Date(sel.firstResponseAt) - +new Date(sel.openedAt)) / 60000)} دقيقة</div>}
      {sel.closedAt && <div>أُغلقت: {new Date(sel.closedAt).toLocaleString('ar-EG')} — {sel.closeReason}</div>}{sel.rating && <div>التقييم: {'⭐'.repeat(sel.rating)} {sel.ratingComment}</div>}
      {sel.kbResult && <div>قاعدة المعرفة: {sel.kbResult === 'solved' ? 'حُلّت ذاتياً' : 'طُلب موظف'}</div>}{sel.summary && <div className="bg-sand rounded p-2 whitespace-pre-wrap"><b>ملخص AI:</b><br />{sel.summary}</div>}</aside></div>}
    {tr && <div className="fixed inset-0 bg-black/50 z-50 p-4 flex flex-col" onClick={() => setTr(null)}><div className="bg-white rounded-lg flex-1 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}><div className="p-2 flex justify-between border-b"><b>سجل تذكرة #{tr.number}</b><button onClick={() => setTr(null)}>✕</button></div>
      <iframe sandbox="" srcDoc={tr.html} className="flex-1 w-full" title="transcript" /></div></div>}</div>;
}
