'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from './ui';
const REGEX = '(?<sender><@!?\\d+>|\\S+),? has transferred `?\\$?(?<amount>[\\d,]+)`? to (?<recipient>.+)';
const KINDS: any = { vodafone: 'فودافون كاش', probot: 'كريديت ديسكورد (ProBot)', custom: 'عملة افتراضية مخصصة' };
const blank = (kind: string): any => kind === 'vodafone' ? { kind, name: 'فودافون كاش', emoji: '📱', instructions: 'حوّل المبلغ المطلوب بالضبط ثم اضغط «رفعت الإيصال» وأرسل صورة الإيصال.', active: true, sortOrder: 0, config: { numbers: [''], feePercent: 0 } }
  : kind === 'probot' ? { kind, name: 'كريديت ديسكورد', emoji: '💰', instructions: 'حوّل المبلغ المطلوب بالضبط عبر ProBot إلى المستلم داخل التذكرة.', active: true, sortOrder: 0, config: { recipientId: '', botId: '282859044593598464', regex: REGEX, taxPercent: 5, rate: 1, currencyName: 'كريديت', currencyEmoji: '💰', confirmMode: 'auto' } }
  : { kind, name: 'عملة مخصصة', emoji: '🪙', instructions: '', active: true, sortOrder: 0, config: { recipientId: '', botId: '', regex: REGEX, taxPercent: 0, rate: 1, currencyName: 'ادم سي', currencyEmoji: '🪙', confirmMode: 'auto' } };
export default function PaymentsManager({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/payments`; const [list, setList] = useState<any[]>([]); const [ed, setEd] = useState<any>(null); const nt = useNotice();
  const load = () => api(url).then((j) => setList(j.methods)).catch(nt.err); useEffect(() => { load(); }, []);
  const up = (k: string, v: any) => setEd((e: any) => ({ ...e, [k]: v })); const uc = (k: string, v: any) => setEd((e: any) => ({ ...e, config: { ...e.config, [k]: v } }));
  async function save() {
    try { const { guildId: _g, ...b } = ed; const c = { ...b.config }; if (b.kind === 'vodafone') c.numbers = (c.numbers || []).map((x: string) => x.trim()).filter(Boolean); else if (!c.regex) c.regex = REGEX;
      await api(url, 'POST', { ...b, config: c }); nt.ok('تم الحفظ'); setEd(null); load(); } catch (e) { nt.err(e); }
  }
  async function toggle(m: any) { try { const { guildId: _g, ...b } = m; await api(url, 'POST', { ...b, active: !m.active }); load(); } catch (e) { nt.err(e); } }
  async function del(m: any) { if (confirm(`حذف «${m.name}»؟`)) { try { await api(`${url}?id=${m.id}`, 'DELETE'); load(); } catch (e) { nt.err(e); } } }
  if (ed) { const v = ed.kind === 'vodafone', c = ed.config;
    return <div className="space-y-3 max-w-2xl"><div className="flex justify-between"><h2 className="text-xl font-bold">{ed.id ? 'تعديل' : 'إضافة'} طريقة دفع — {KINDS[ed.kind]}</h2><Btn kind="ghost" onClick={() => setEd(null)}>رجوع</Btn></div>
      <section className="bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3">
        <Field label="الاسم (عربي)"><input className={inp} maxLength={40} value={ed.name} onChange={(e) => up('name', e.target.value)} /></Field>
        <Field label="الأيقونة (إيموجي)"><input className={inp} maxLength={40} value={ed.emoji} onChange={(e) => up('emoji', e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="تعليمات الدفع للعميل"><textarea className={inp} rows={3} maxLength={1500} value={ed.instructions} onChange={(e) => up('instructions', e.target.value)} /></Field></div>
        <Field label="ترتيب العرض"><Num min={0} value={ed.sortOrder} onChange={(v: number) => up('sortOrder', v)} /></Field><div className="flex items-end"><Toggle label="مفعّلة" value={ed.active} onChange={(x) => up('active', x)} /></div></section>
      {v ? <section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">إعدادات فودافون كاش</h3>
        <Field label="أرقام الاستلام" hint="رقم في كل سطر. التأكيد يدوي: الموظف يؤكد استلام المبلغ."><textarea dir="ltr" className={inp} rows={3} value={(c.numbers || []).join('\n')} onChange={(e) => uc('numbers', e.target.value.split('\n'))} /></Field>
        <Field label="رسوم إضافية %" hint="تُضاف على المبلغ المطلوب من العميل"><Num min={0} step="0.1" value={c.feePercent} onChange={(x: number) => uc('feePercent', x)} /></Field></section>
      : <section className="bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3"><h3 className="font-bold md:col-span-2">إعدادات {ed.kind === 'probot' ? 'ProBot' : 'العملة المخصصة'}</h3>
        {ed.kind === 'custom' && <><Field label="اسم العملة"><input className={inp} value={c.currencyName || ''} maxLength={30} onChange={(e) => uc('currencyName', e.target.value)} /></Field><Field label="إيموجي العملة"><input className={inp} value={c.currencyEmoji || ''} maxLength={40} onChange={(e) => uc('currencyEmoji', e.target.value)} /></Field></>}
        <Field label="معرّف المستلم (User ID)"><input dir="ltr" className={inp} value={c.recipientId || ''} onChange={(e) => uc('recipientId', e.target.value.trim())} /></Field>
        <Field label="معرّف بوت التحويل (Bot ID)"><input dir="ltr" className={inp} value={c.botId || ''} onChange={(e) => uc('botId', e.target.value.trim())} /></Field>
        <Field label="نسبة الضريبة %" hint="يطلب البوت المبلغ ÷ (1 − الضريبة) مقرّباً للأعلى"><Num min={0} step="0.1" value={c.taxPercent} onChange={(x: number) => uc('taxPercent', x)} /></Field>
        <Field label="سعر التحويل: كم عملة لكل 1 جنيه" hint="يمكن تخصيص سعر ثابت لكل باقة من صفحة المنتج"><Num min={0} step="0.0001" value={c.rate} onChange={(x: number) => uc('rate', x)} /></Field>
        <Field label="طريقة التأكيد"><select className={inp} value={c.confirmMode || 'auto'} onChange={(e) => uc('confirmMode', e.target.value)}><option value="auto">تلقائي (قراءة رسالة التحويل)</option><option value="staff">يدوي (الموظف يؤكد)</option></select></Field>
        <div className="md:col-span-2"><Field label="نمط رسالة التأكيد (Regex)" hint="يجب أن يحتوي المجموعة (?<amount>..) ويمكن إضافة (?<sender>..) و(?<recipient>..)"><textarea dir="ltr" className={`${inp} font-mono text-xs`} rows={3} value={c.regex || ''} onChange={(e) => uc('regex', e.target.value)} /></Field>
          <Btn kind="ghost" className="mt-1" onClick={() => uc('regex', REGEX)}>استرجاع النمط الافتراضي</Btn></div></section>}
      {nt.view}<Btn onClick={save}>حفظ</Btn></div>; }
  return <div className="space-y-4"><div className="flex flex-wrap gap-2 items-center"><h2 className="text-lg font-bold ml-auto">طرق الدفع</h2>{Object.entries(KINDS).map(([k, l]) => <Btn key={k} kind="ghost" onClick={() => { nt.clear(); setEd(blank(k)); }}>+ {l as string}</Btn>)}</div>{nt.view}
    {!list.length && <p className="text-gray-500">لم تُضف طرق دفع بعد.</p>}
    <div className="grid md:grid-cols-2 gap-3">{list.map((m) => <div key={m.id} className={`bg-white border rounded-lg p-3 space-y-2 ${m.active ? '' : 'opacity-60'}`}>
      <div className="flex justify-between"><b>{m.emoji} {m.name}</b><span className="text-xs bg-sand rounded px-2 py-0.5">{KINDS[m.kind]}</span></div>
      <p className="text-xs text-gray-600">{m.kind === 'vodafone' ? `أرقام: ${(m.config.numbers || []).join('، ')}` : `المستلم: ${m.config.recipientId || '—'} · التأكيد: ${m.config.confirmMode === 'staff' ? 'يدوي' : 'تلقائي'}`}</p>
      <div className="flex gap-2"><Btn kind="ghost" onClick={() => { nt.clear(); setEd(m); }}>تعديل</Btn><Btn kind="ghost" onClick={() => toggle(m)}>{m.active ? 'تعطيل' : 'تفعيل'}</Btn><Btn kind="danger" onClick={() => del(m)}>حذف</Btn></div></div>)}</div></div>;
}
