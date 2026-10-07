'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import MultiChannelSelect from '../MultiChannelSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from '../store/ui';
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export default function InsightsSettings({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/insights/settings`; const [s, setS] = useState<any>(null); const nt = useNotice(); useEffect(() => { api(url).then(setS).catch(nt.err); }, []); if (!s) return <>{nt.view || <p>...</p>}</>;
  const up = (k: string, v: any) => setS({ ...s, [k]: v }); const sub = (sec: string, k: string, v: any) => setS({ ...s, [sec]: { ...s[sec], [k]: v } }); const card = 'bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3';
  async function save() { nt.clear(); try { const { timezone, ...b } = s; await api(url, 'PUT', b); nt.ok('تم الحفظ'); } catch (e) { nt.err(e); } }
  return <div className="space-y-4 max-w-3xl"><p className="text-sm text-gray-600">المنطقة الزمنية: <b dir="ltr">{s.timezone}</b> · لا تُخزَّن نصوص الرسائل أبداً، فقط الأعداد.</p>
    <section className={card}><h3 className="font-bold md:col-span-2">📈 الملخص الأسبوعي للمالك</h3><Toggle label="مفعّل" value={s.weekly.enabled} onChange={(v) => sub('weekly', 'enabled', v)} /><Toggle label="إرساله أيضاً بالخاص لمالك السيرفر" value={s.digestDm} onChange={(v) => up('digestDm', v)} />
      <div className="md:col-span-2"><Field label="قناة الملخص (خاصة)" hint="فارغة = قناة لوج الستاف"><ChannelSelect guildId={guildId} value={s.digestChannelId} onChange={(v) => up('digestChannelId', v)} /></Field></div>
      <Field label="اليوم"><select className={inp} value={s.weekly.day} onChange={(e) => sub('weekly', 'day', Number(e.target.value))}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></Field><Field label="الساعة (0-23)"><Num min={0} max={23} value={s.weekly.hour} onChange={(v: number) => sub('weekly', 'hour', v)} /></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">😴 تنبيه التسرّب</h3><Field label="يُعدّ العضو معرّضاً للمغادرة بعد صمت (يوم)"><Num min={2} max={29} value={s.churnDays} onChange={(v: number) => up('churnDays', v)} /></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">🧠 ملخص يومي بالذكاء الاصطناعي (اختياري)</h3><Toggle label="مفعّل (يستهلك الحصة اليومية المجانية)" value={s.aiSummary.enabled} onChange={(v) => sub('aiSummary', 'enabled', v)} />
      <Field label="الحد الأقصى للملخصات يومياً (1-10)"><Num min={1} max={10} value={s.aiSummary.cap} onChange={(v: number) => sub('aiSummary', 'cap', v)} /></Field><Field label="الساعة (0-23)"><Num min={0} max={23} value={s.aiSummary.hour} onChange={(v: number) => sub('aiSummary', 'hour', v)} /></Field>
      <Field label="قناة نشر الملخصات"><ChannelSelect guildId={guildId} value={s.aiSummary.postChannelId} onChange={(v) => sub('aiSummary', 'postChannelId', v)} /></Field>
      <div className="md:col-span-2"><Field label="القنوات المشمولة بالتلخيص" hint="تُحفظ عيّنة من الرسائل في الذاكرة فقط حتى وقت التلخيص ثم تُحذف."><MultiChannelSelect guildId={guildId} value={s.aiSummary.channelIds} onChange={(v) => sub('aiSummary', 'channelIds', v)} /></Field></div></section>
    {nt.view}<Btn onClick={save}>حفظ</Btn></div>;
}
