'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import RoleSelect from '../RoleSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from '../store/ui';
const PRIO: any = { low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' };
const blank = () => ({ name: '', emoji: '🎫', staffRoleIds: [] as string[], parentId: null as string | null, questions: [] as any[], defaultPriority: 'normal', greeting: '', firstResponseMin: null as number | null, resolutionMin: null as number | null, escalationRoleId: null as string | null, sortOrder: 0, active: true });
export default function CategoriesManager({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/tickets/categories`; const [list, setList] = useState<any[]>([]); const [ed, setEd] = useState<any>(null); const nt = useNotice();
  const load = () => api(url).then((j) => setList(j.categories)).catch(nt.err); useEffect(() => { load(); }, []);
  const up = (k: string, v: any) => setEd((e: any) => ({ ...e, [k]: v })); const setQ = (i: number, p: any) => up('questions', ed.questions.map((q: any, j: number) => (j === i ? { ...q, ...p } : q)));
  async function save() { try { const { guildId: _g, ...b } = ed; await api(url, 'POST', b); nt.ok('تم الحفظ'); setEd(null); load(); } catch (e) { nt.err(e); } }
  async function del(c: any) { if (confirm(`حذف القسم «${c.name}»؟`)) { try { await api(`${url}?id=${c.id}`, 'DELETE'); load(); } catch (e) { nt.err(e); } } }
  if (ed) return <div className="space-y-3 max-w-2xl"><div className="flex justify-between"><h2 className="text-lg font-bold">{ed.id ? 'تعديل قسم' : 'قسم جديد'}</h2><Btn kind="ghost" onClick={() => setEd(null)}>رجوع</Btn></div>
    <section className="bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3">
      <Field label="اسم القسم"><input className={inp} maxLength={60} value={ed.name} onChange={(e) => up('name', e.target.value)} /></Field>
      <Field label="الإيموجي"><input className={inp} maxLength={40} value={ed.emoji} onChange={(e) => up('emoji', e.target.value)} /></Field>
      <Field label="الأولوية الافتراضية"><select className={inp} value={ed.defaultPriority} onChange={(e) => up('defaultPriority', e.target.value)}>{Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}</select></Field>
      <Field label="ترتيب العرض"><Num min={0} value={ed.sortOrder} onChange={(v: number) => up('sortOrder', v)} /></Field>
      <div className="md:col-span-2"><Field label="رتب ستاف هذا القسم" hint="فارغ = رتب الستاف العامة"><RoleSelect guildId={guildId} value={ed.staffRoleIds} onChange={(v) => up('staffRoleIds', v)} /></Field></div>
      <Field label="كاتيجوري التذاكر"><ChannelSelect guildId={guildId} types={[4]} value={ed.parentId} onChange={(v) => up('parentId', v)} /></Field>
      <div className="md:col-span-2"><Field label="رسالة الترحيب التلقائية" hint="المتغير: {user}"><textarea className={inp} rows={3} maxLength={1500} value={ed.greeting} onChange={(e) => up('greeting', e.target.value)} /></Field></div>
      <Toggle label="القسم مفعّل" value={ed.active} onChange={(v) => up('active', v)} /></section>
    <section className="bg-white border rounded-lg p-4 grid md:grid-cols-3 gap-3"><h3 className="font-bold md:col-span-3">اتفاقية مستوى الخدمة (SLA)</h3>
      <Field label="أول رد خلال (دقيقة)" hint="فارغ = بدون"><Num min={0} value={ed.firstResponseMin} onChange={(v: number) => up('firstResponseMin', v || null)} /></Field>
      <Field label="الحل خلال (دقيقة)" hint="فارغ = بدون"><Num min={0} value={ed.resolutionMin} onChange={(v: number) => up('resolutionMin', v || null)} /></Field>
      <Field label="رتبة التصعيد عند التجاوز"><RoleSelect guildId={guildId} value={ed.escalationRoleId ? [ed.escalationRoleId] : []} onChange={(v) => up('escalationRoleId', v[v.length - 1] || null)} /></Field></section>
    <section className="bg-white border rounded-lg p-4 space-y-2"><div className="flex justify-between"><h3 className="font-bold">أسئلة فتح التذكرة (حتى 5)</h3>{ed.questions.length < 5 && <Btn kind="ghost" onClick={() => up('questions', [...ed.questions, { label: '', required: true, long: false }])}>+ سؤال</Btn>}</div>
      {ed.questions.map((q: any, i: number) => <div key={i} className="grid md:grid-cols-4 gap-2 items-end border rounded p-2 bg-sand/40"><div className="md:col-span-2"><Field label="السؤال"><input className={inp} maxLength={45} value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} /></Field></div>
        <div className="flex gap-3"><Toggle label="إجباري" value={q.required} onChange={(v) => setQ(i, { required: v })} /><Toggle label="طويل" value={q.long} onChange={(v) => setQ(i, { long: v })} /></div><Btn kind="danger" onClick={() => up('questions', ed.questions.filter((_: any, j: number) => j !== i))}>حذف</Btn></div>)}</section>
    {nt.view}<Btn onClick={save}>حفظ</Btn></div>;
  return <div className="space-y-3"><div className="flex justify-between"><h2 className="text-lg font-bold">أقسام التذاكر</h2><Btn onClick={() => { nt.clear(); setEd(blank()); }}>+ قسم</Btn></div>{nt.view}
    <div className="grid md:grid-cols-2 gap-3">{list.map((c) => <div key={c.id} className={`bg-white border rounded-lg p-3 space-y-1 ${c.active ? '' : 'opacity-60'}`}><b>{c.emoji} {c.name}</b>
      <p className="text-xs text-gray-600">أولوية: {PRIO[c.defaultPriority]} · أول رد: {c.firstResponseMin ? `${c.firstResponseMin} د` : '—'} · الحل: {c.resolutionMin ? `${c.resolutionMin} د` : '—'} · أسئلة: {(c.questions || []).length}</p>
      <div className="flex gap-2"><Btn kind="ghost" onClick={() => { nt.clear(); setEd({ ...c }); }}>تعديل</Btn><Btn kind="danger" onClick={() => del(c)}>حذف</Btn></div></div>)}{!list.length && <p className="text-gray-500">لا توجد أقسام.</p>}</div></div>;
}
