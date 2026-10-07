'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import RoleSelect from '../RoleSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from '../store/ui';
export default function TicketSettingsForm({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/tickets/settings`; const [s, setS] = useState<any>(null); const nt = useNotice(); const [busy, setBusy] = useState(false);
  useEffect(() => { api(url).then(setS).catch(nt.err); }, []); if (!s) return <>{nt.view || <p>...</p>}</>; const up = (k: string, v: any) => setS({ ...s, [k]: v });
  async function save(pub: boolean) { setBusy(true); nt.clear(); try { if (pub && !s.channelId) throw new Error('اختر قناة اللوحة أولاً'); await api(url, 'PUT', s);
    if (pub) { await api(`/api/guilds/${guildId}/general/publish`, 'POST', { module: 'tickets', panel: 'main', channelId: s.channelId }); nt.ok('تم الحفظ وإرسال طلب النشر'); } else nt.ok('تم الحفظ'); } catch (e) { nt.err(e); } finally { setBusy(false); } }
  return <div className="space-y-3 max-w-2xl"><section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">لوحة التذاكر</h3>
    <Field label="قناة اللوحة"><ChannelSelect guildId={guildId} value={s.channelId} onChange={(v) => up('channelId', v)} /></Field>
    <Field label="شكل اللوحة"><select className={inp} value={s.style} onChange={(e) => up('style', e.target.value)}><option value="select">قائمة منسدلة</option><option value="buttons">أزرار لكل قسم</option></select></Field>
    <Field label="العنوان"><input className={inp} maxLength={256} value={s.title} onChange={(e) => up('title', e.target.value)} /></Field>
    <Field label="الوصف"><textarea className={inp} rows={3} maxLength={2000} value={s.description} onChange={(e) => up('description', e.target.value)} /></Field>
    <Field label="اللون"><input type="color" className="h-10 w-24" value={s.color} onChange={(e) => up('color', e.target.value)} /></Field></section>
    <section className="bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3"><h3 className="font-bold md:col-span-2">السلوك</h3>
      <Field label="أقصى تذاكر مفتوحة لكل عضو"><Num min={1} value={s.maxOpen} onChange={(v: number) => up('maxOpen', v)} /></Field>
      <Field label="حذف قناة التذكرة المغلقة بعد (ساعة)"><Num min={1} value={s.closeDeleteHours} onChange={(v: number) => up('closeDeleteHours', v)} /></Field>
      <Field label="تذكير «غير مستلمة» بعد (دقيقة، 0 = تعطيل)"><Num min={0} value={s.unclaimedMin} onChange={(v: number) => up('unclaimedMin', v)} /></Field>
      <Field label="رتبة التصعيد الافتراضية"><RoleSelect guildId={guildId} value={s.escalationRoleId ? [s.escalationRoleId] : []} onChange={(v) => up('escalationRoleId', v[v.length - 1] || null)} /></Field>
      <Toggle label="الرد التلقائي من قاعدة المعرفة" value={s.kbEnabled} onChange={(v) => up('kbEnabled', v)} /><Toggle label="التوجيه الذكي بالذكاء الاصطناعي (حصة يومية)" value={s.aiRouting} onChange={(v) => up('aiRouting', v)} />
      <Toggle label="ملخص AI عند الإغلاق (حصة يومية)" value={s.aiSummary} onChange={(v) => up('aiSummary', v)} /><Toggle label="إرسال السجل للعميل بالخاص" value={s.dmTranscript} onChange={(v) => up('dmTranscript', v)} /></section>
    {nt.view}<div className="flex gap-2"><Btn disabled={busy} onClick={() => save(false)}>حفظ</Btn><Btn disabled={busy} kind="ghost" onClick={() => save(true)}>حفظ + نشر / تحديث اللوحة</Btn></div></div>;
}
