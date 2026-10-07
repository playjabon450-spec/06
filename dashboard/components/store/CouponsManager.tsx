'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from './ui';
const blank = () => ({ code: '', kind: 'percent', value: 10, minOrder: 0, expiresAt: null as string | null, maxUses: null as number | null, maxPerUser: null as number | null, productIds: [] as string[], active: true });
export default function CouponsManager({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/store/coupons`; const [list, setList] = useState<any[]>([]); const [products, setProducts] = useState<any[]>([]); const [ed, setEd] = useState<any>(null); const nt = useNotice();
  const load = () => api(url).then((j) => { setList(j.coupons); setProducts(j.products); }).catch(nt.err); useEffect(() => { load(); }, []);
  const up = (k: string, v: any) => setEd((e: any) => ({ ...e, [k]: v }));
  async function save() { try { await api(url, 'POST', { ...ed, code: String(ed.code).toUpperCase(), expiresAt: ed.expiresAt ? new Date(ed.expiresAt).toISOString() : null, maxUses: ed.maxUses || null, maxPerUser: ed.maxPerUser || null }); nt.ok('تم الحفظ'); setEd(null); load(); } catch (e) { nt.err(e); } }
  async function del(c: any) { if (confirm(`حذف الكوبون ${c.code}؟`)) { try { await api(`${url}?id=${c.id}`, 'DELETE'); load(); } catch (e) { nt.err(e); } } }
  if (ed) return <div className="bg-white border rounded-lg p-4 max-w-2xl space-y-3"><h2 className="font-bold">{ed.id ? 'تعديل كوبون' : 'كوبون جديد'}</h2>
    <div className="grid md:grid-cols-2 gap-3">
      <Field label="الكود" hint="حروف إنجليزية وأرقام فقط"><input dir="ltr" className={inp} value={ed.code} maxLength={24} onChange={(e) => up('code', e.target.value.toUpperCase())} /></Field>
      <Field label="النوع"><select className={inp} value={ed.kind} onChange={(e) => up('kind', e.target.value)}><option value="percent">نسبة مئوية %</option><option value="fixed">مبلغ ثابت (ج.م)</option></select></Field>
      <Field label={ed.kind === 'percent' ? 'نسبة الخصم %' : 'قيمة الخصم (ج.م)'}><Num min={0} step="0.01" value={ed.value} onChange={(v: number) => up('value', v)} /></Field>
      <Field label="الحد الأدنى للطلب (ج.م)"><Num min={0} value={ed.minOrder} onChange={(v: number) => up('minOrder', v)} /></Field>
      <Field label="تاريخ الانتهاء"><input type="datetime-local" className={inp} value={ed.expiresAt ? String(ed.expiresAt).slice(0, 16) : ''} onChange={(e) => up('expiresAt', e.target.value || null)} /></Field>
      <Field label="أقصى استخدامات (0 = بلا حد)"><Num min={0} value={ed.maxUses} onChange={(v: number) => up('maxUses', v || null)} /></Field>
      <Field label="أقصى استخدامات لكل عضو (0 = بلا حد)"><Num min={0} value={ed.maxPerUser} onChange={(v: number) => up('maxPerUser', v || null)} /></Field></div>
    <Field label="المنتجات المطبّق عليها (فارغ = الكل)"><div className="flex flex-wrap gap-1">{products.map((p) => <button type="button" key={p.id} onClick={() => up('productIds', ed.productIds.includes(p.id) ? ed.productIds.filter((x: string) => x !== p.id) : [...ed.productIds, p.id])}
      className={`px-2 py-0.5 rounded-full text-sm border ${ed.productIds.includes(p.id) ? 'bg-sea text-white' : 'bg-sand'}`}>{p.name}</button>)}</div></Field>
    <Toggle label="مفعّل" value={ed.active} onChange={(v) => up('active', v)} />{nt.view}
    <div className="flex gap-2"><Btn onClick={save}>حفظ</Btn><Btn kind="ghost" onClick={() => setEd(null)}>إلغاء</Btn></div></div>;
  return <div className="space-y-3"><div className="flex justify-between"><h2 className="text-lg font-bold">الكوبونات</h2><Btn onClick={() => { nt.clear(); setEd(blank()); }}>+ كوبون</Btn></div>{nt.view}
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['الكود', 'الخصم', 'الحد الأدنى', 'الاستخدام', 'الانتهاء', 'الحالة', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{list.map((c) => <tr key={c.id} className="border-t"><td className="p-2 font-mono" dir="ltr">{c.code}</td><td className="p-2">{c.kind === 'percent' ? `${c.value}%` : `${c.value} ج`}</td><td className="p-2">{c.minOrder || '—'}</td>
        <td className="p-2">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td><td className="p-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-EG') : '—'}</td><td className="p-2">{c.active ? '✅ مفعّل' : '⏸️ معطّل'}</td>
        <td className="p-2 flex gap-1"><Btn kind="ghost" onClick={() => { nt.clear(); setEd({ ...c }); }}>تعديل</Btn><Btn kind="danger" onClick={() => del(c)}>حذف</Btn></td></tr>)}
        {!list.length && <tr><td colSpan={7} className="p-4 text-center text-gray-500">لا توجد كوبونات</td></tr>}</tbody></table></div></div>;
}
