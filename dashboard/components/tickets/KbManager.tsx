'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Toggle, Btn, useNotice } from '../store/ui';
const blank = () => ({ question: '', keywords: [] as string[], answer: '', attachments: [] as string[], active: true });
export default function KbManager({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/tickets/kb`; const [d, setD] = useState<any>({ articles: [], totals: { hits: 0, resolved: 0, rate: 0 } }); const [ed, setEd] = useState<any>(null); const nt = useNotice();
  const load = () => api(url).then(setD).catch(nt.err); useEffect(() => { load(); }, []);
  const up = (k: string, v: any) => setEd((e: any) => ({ ...e, [k]: v }));
  async function save() { try { const { id, question, keywords, answer, attachments, active } = ed; await api(url, 'POST', { id, question, keywords, answer, attachments, active }); nt.ok('تم الحفظ'); setEd(null); load(); } catch (e) { nt.err(e); } }
  async function del(a: any) { if (confirm('حذف المقال؟')) { try { await api(`${url}?id=${a.id}`, 'DELETE'); load(); } catch (e) { nt.err(e); } } }
  if (ed) return <div className="bg-white border rounded-lg p-4 max-w-2xl space-y-3"><h2 className="font-bold">{ed.id ? 'تعديل مقال' : 'مقال جديد'}</h2>
    <Field label="السؤال"><input className={inp} maxLength={200} value={ed.question} onChange={(e) => up('question', e.target.value)} /></Field>
    <Field label="الكلمات المفتاحية" hint="كلمة أو عبارة في كل سطر. وجود كلمة في رسالة العميل يرفع التطابق."><textarea className={inp} rows={3} value={ed.keywords.join('\n')} onChange={(e) => up('keywords', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></Field>
    <Field label="الإجابة"><textarea className={inp} rows={6} maxLength={3500} value={ed.answer} onChange={(e) => up('answer', e.target.value)} /></Field>
    <Field label="روابط مرفقات (اختياري، رابط في كل سطر)"><textarea dir="ltr" className={inp} rows={2} value={ed.attachments.join('\n')} onChange={(e) => up('attachments', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></Field>
    <Toggle label="مفعّل" value={ed.active} onChange={(v) => up('active', v)} />{nt.view}<div className="flex gap-2"><Btn onClick={save}>حفظ</Btn><Btn kind="ghost" onClick={() => setEd(null)}>إلغاء</Btn></div></div>;
  return <div className="space-y-3"><div className="flex justify-between items-center"><h2 className="text-lg font-bold">قاعدة المعرفة</h2><Btn onClick={() => { nt.clear(); setEd(blank()); }}>+ مقال</Btn></div>
    <div className="grid grid-cols-3 gap-3 text-center">{[['مرات الظهور', d.totals.hits], ['حُلّت ذاتياً', d.totals.resolved], ['نسبة النجاح', `${d.totals.rate}%`]].map(([l, v]) => <div key={l as string} className="bg-white border rounded-lg p-3"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>)}</div>{nt.view}
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['السؤال', 'ظهور', 'حُلّت', 'طلب موظف', 'النسبة', 'الحالة', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{d.articles.map((a: any) => <tr key={a.id} className="border-t"><td className="p-2">{a.question}</td><td className="p-2">{a.hits}</td><td className="p-2">{a.resolved}</td><td className="p-2">{a.escalated}</td><td className="p-2">{a.hits ? Math.round((a.resolved / a.hits) * 100) : 0}%</td><td className="p-2">{a.active ? '✅' : '⏸️'}</td>
        <td className="p-2 flex gap-1"><Btn kind="ghost" onClick={() => { nt.clear(); setEd({ ...a }); }}>تعديل</Btn><Btn kind="danger" onClick={() => del(a)}>حذف</Btn></td></tr>)}{!d.articles.length && <tr><td colSpan={7} className="p-4 text-center text-gray-500">لا توجد مقالات</td></tr>}</tbody></table></div></div>;
}
