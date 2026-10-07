'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import { api, inp, Field, Num, Btn, useNotice } from './ui';
export default function StorePanelForm({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/store/settings`; const [s, setS] = useState<any>(null); const nt = useNotice(); const [busy, setBusy] = useState(false);
  useEffect(() => { api(url).then(setS).catch(nt.err); }, []);
  if (!s) return <>{nt.view || <p>...</p>}</>;
  const up = (k: string, v: any) => setS({ ...s, [k]: v });
  async function save(publish: boolean) {
    setBusy(true); nt.clear();
    try {
      if (publish && !s.channelId) throw new Error('اختر قناة المتجر أولاً');
      await api(url, 'PUT', { ...s, image: s.image || null });
      if (publish) { await api(`/api/guilds/${guildId}/general/publish`, 'POST', { module: 'store', panel: 'order', channelId: s.channelId }); nt.ok('تم الحفظ وإرسال طلب النشر، سيظهر في ديسكورد خلال ثوانٍ'); } else nt.ok('تم الحفظ');
    } catch (e) { nt.err(e); } finally { setBusy(false); }
  }
  return <div className="grid lg:grid-cols-2 gap-4"><div className="space-y-3">
    <section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">لوحة المتجر</h3>
      <Field label="قناة المتجر"><ChannelSelect guildId={guildId} value={s.channelId} onChange={(v) => up('channelId', v)} /></Field>
      <Field label="العنوان"><input className={inp} maxLength={256} value={s.title} onChange={(e) => up('title', e.target.value)} /></Field>
      <Field label="الوصف"><textarea className={inp} rows={4} maxLength={2000} value={s.description} onChange={(e) => up('description', e.target.value)} /></Field>
      <Field label="رابط الصورة"><input dir="ltr" className={inp} value={s.image || ''} onChange={(e) => up('image', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="اللون"><input type="color" className="h-10 w-full" value={s.color} onChange={(e) => up('color', e.target.value)} /></Field>
        <Field label="نص زر الطلب"><input className={inp} maxLength={80} value={s.buttonLabel} onChange={(e) => up('buttonLabel', e.target.value)} /></Field></div></section>
    <section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">إعدادات الطلبات</h3>
      <Field label="كاتيجوري تذاكر الطلبات"><ChannelSelect guildId={guildId} types={[4]} value={s.ticketCategoryId} onChange={(v) => up('ticketCategoryId', v)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="أقصى طلبات مفتوحة لكل عضو"><Num min={1} value={s.maxOpenOrders} onChange={(v: number) => up('maxOpenOrders', v)} /></Field>
        <Field label="فاصل منع التكرار (ثانية)"><Num min={0} value={s.cooldownSeconds} onChange={(v: number) => up('cooldownSeconds', v)} /></Field>
        <Field label="انتهاء الطلب غير المدفوع (دقيقة)"><Num min={5} value={s.expireMinutes} onChange={(v: number) => up('expireMinutes', v)} /></Field>
        <Field label="إغلاق التذكرة بعد التسليم (دقيقة)"><Num min={1} value={s.autoCloseMinutes} onChange={(v: number) => up('autoCloseMinutes', v)} /></Field>
        <Field label="تذكير التجديد قبل (أيام)"><Num min={1} value={s.reminderDays} onChange={(v: number) => up('reminderDays', v)} /></Field></div></section>
    {nt.view}<div className="flex gap-2"><Btn disabled={busy} onClick={() => save(false)}>حفظ</Btn><Btn disabled={busy} kind="ghost" onClick={() => save(true)}>حفظ + نشر / تحديث اللوحة</Btn></div></div>
    <div><h3 className="font-bold mb-2">معاينة مباشرة</h3>
      <div className="bg-[#313338] text-white rounded-lg p-4 max-w-md"><div className="rounded bg-[#2b2d31] border-r-4 p-3 space-y-2" style={{ borderColor: s.color }}>
        <div className="font-bold">{s.title}</div><div className="text-sm whitespace-pre-wrap text-gray-200">{s.description}</div>
        {s.image && <img src={s.image} alt="" className="rounded max-h-48 w-full object-cover" />}</div>
        <button type="button" className="mt-2 bg-[#248046] rounded px-4 py-1.5 text-sm">{s.buttonLabel}</button></div></div></div>;
}
