'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import MultiChannelSelect from '../MultiChannelSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from '../store/ui';
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export default function StaffSettingsForm({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/staff/settings`; const [s, setS] = useState<any>(null); const nt = useNotice();
  useEffect(() => { api(url).then(setS).catch(nt.err); }, []); if (!s) return <>{nt.view || <p>...</p>}</>;
  const up = (k: string, v: any) => setS({ ...s, [k]: v }); const sub = (sec: string, k: string, v: any) => setS({ ...s, [sec]: { ...s[sec], [k]: v } }); const card = 'bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3';
  async function save() { nt.clear(); try { const { timezone, ...b } = s; await api(url, 'PUT', b); nt.ok('تم الحفظ'); } catch (e) { nt.err(e); } }
  async function send(kind: string) { try { await api(`/api/guilds/${guildId}/staff/report`, 'POST', { kind }); nt.ok('تم طلب إرسال التقرير، سيظهر خلال ثوانٍ'); } catch (e) { nt.err(e); } }
  return <div className="space-y-4 max-w-3xl"><p className="text-sm text-gray-600">المنطقة الزمنية الحالية: <b dir="ltr">{s.timezone}</b> (تُعدَّل من صفحة الإعدادات).</p>
    <section className={card}><h3 className="font-bold md:col-span-2">📊 التقارير التلقائية</h3><div className="md:col-span-2"><Field label="قناة التقارير" hint="فارغة = قناة لوج الستاف"><ChannelSelect guildId={guildId} value={s.reportChannelId} onChange={(v) => up('reportChannelId', v)} /></Field></div>
      <div className="space-y-2"><Toggle label="تقرير أسبوعي" value={s.weekly.enabled} onChange={(v) => sub('weekly', 'enabled', v)} /><Field label="اليوم"><select className={inp} value={s.weekly.day} onChange={(e) => sub('weekly', 'day', Number(e.target.value))}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></Field><Field label="الساعة (0-23)"><Num min={0} max={23} value={s.weekly.hour} onChange={(v: number) => sub('weekly', 'hour', v)} /></Field></div>
      <div className="space-y-2"><Toggle label="تقرير شهري" value={s.monthly.enabled} onChange={(v) => sub('monthly', 'enabled', v)} /><Field label="يوم الشهر (1-28)"><Num min={1} max={28} value={s.monthly.day} onChange={(v: number) => sub('monthly', 'day', v)} /></Field><Field label="الساعة (0-23)"><Num min={0} max={23} value={s.monthly.hour} onChange={(v: number) => sub('monthly', 'hour', v)} /></Field></div>
      <div className="md:col-span-2 flex gap-2"><Btn kind="ghost" onClick={() => send('weekly')}>إرسال التقرير الأسبوعي الآن</Btn><Btn kind="ghost" onClick={() => send('monthly')}>إرسال التقرير الشهري الآن</Btn></div></section>
    <section className={card}><h3 className="font-bold md:col-span-2">💬 قنوات دعم إضافية لحساب الرسائل</h3><div className="md:col-span-2"><MultiChannelSelect guildId={guildId} value={s.supportChannelIds} onChange={(v) => up('supportChannelIds', v)} /></div></section>
    <section className={card}><h3 className="font-bold md:col-span-2">😴 تنبيهات الخمول</h3><Toggle label="مفعّلة (تنبيه لمالك السيرفر مع زر «تجاهل»)" value={s.inactivity.enabled} onChange={(v) => sub('inactivity', 'enabled', v)} /><Field label="عدد أيام عدم النشاط"><Num min={1} value={s.inactivity.days} onChange={(v: number) => sub('inactivity', 'days', v)} /></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">📋 لوحة التقديم</h3><Field label="قناة لوحة التقديم"><ChannelSelect guildId={guildId} value={s.applications.channelId} onChange={(v) => sub('applications', 'channelId', v)} /></Field>
      <Field label="قناة مراجعة الطلبات (الستاف)" hint="فارغة = قناة لوج الستاف"><ChannelSelect guildId={guildId} value={s.applications.reviewChannelId} onChange={(v) => sub('applications', 'reviewChannelId', v)} /></Field>
      <Field label="العنوان"><input className={inp} maxLength={256} value={s.applications.title} onChange={(e) => sub('applications', 'title', e.target.value)} /></Field><Field label="اللون"><input type="color" className="h-10 w-24" value={s.applications.color} onChange={(e) => sub('applications', 'color', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field label="الوصف"><textarea className={inp} rows={3} maxLength={2000} value={s.applications.description} onChange={(e) => sub('applications', 'description', e.target.value)} /></Field></div></section>
    {nt.view}<Btn onClick={save}>حفظ</Btn></div>;
}
