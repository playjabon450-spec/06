'use client';
import { useEffect, useState } from 'react';
import MultiChannelSelect from '../MultiChannelSelect';
import RoleSelect from '../RoleSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from '../store/ui';
const lines = (s: string) => s.split('\n').map((x) => x.trim().toLowerCase()).filter(Boolean);
export default function ShieldSettingsForm({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/shield/settings`; const [s, setS] = useState<any>(null); const nt = useNotice();
  useEffect(() => { api(url).then(setS).catch(nt.err); }, []); if (!s) return <>{nt.view || <p>...</p>}</>;
  const up = (sec: string, k: string, v: any) => setS({ ...s, [sec]: { ...s[sec], [k]: v } }); const lb = s.linkBlock, cp = s.compromised, rd = s.raid, ap = s.appeals;
  async function save() { nt.clear(); try { await api(url, 'PUT', s); nt.ok('تم الحفظ'); } catch (e) { nt.err(e); } }
  const card = 'bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3';
  return <div className="space-y-4 max-w-3xl">
    <section className={card}><h3 className="font-bold md:col-span-2">🔗 حاجز الروابط الاحتيالية</h3><Toggle label="مفعّل" value={lb.enabled} onChange={(v) => up('linkBlock', 'enabled', v)} />
      <Field label="الإجراء عند الاكتشاف"><select className={inp} value={lb.action} onChange={(e) => up('linkBlock', 'action', e.target.value)}><option value="delete">حذف الرسالة</option><option value="timeout">حذف + كتم مؤقت</option><option value="quarantine">حذف + عزل</option></select></Field>
      {lb.action === 'timeout' && <Field label="مدة الكتم (دقيقة)"><Num min={1} value={lb.timeoutMinutes} onChange={(v: number) => up('linkBlock', 'timeoutMinutes', v)} /></Field>}
      <div className="md:col-span-2"><Field label="رتب مستثناة (الأدمن والستاف مستثنون دائماً)"><RoleSelect guildId={guildId} value={lb.exemptRoleIds} onChange={(v) => up('linkBlock', 'exemptRoleIds', v)} /></Field></div>
      <Field label="نطاقات محظورة إضافية" hint="نطاق في كل سطر"><textarea dir="ltr" className={inp} rows={3} value={lb.customDomains.join('\n')} onChange={(e) => up('linkBlock', 'customDomains', lines(e.target.value))} /></Field>
      <Field label="نطاقات مسموحة دائماً" hint="لتفادي الإنذارات الخاطئة"><textarea dir="ltr" className={inp} rows={3} value={lb.allowDomains.join('\n')} onChange={(e) => up('linkBlock', 'allowDomains', lines(e.target.value))} /></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">🚨 كشف الحسابات المخترقة</h3><Toggle label="مفعّل" value={cp.enabled} onChange={(v) => up('compromised', 'enabled', v)} />
      <Field label="الحساسية"><select className={inp} value={cp.sensitivity} onChange={(e) => up('compromised', 'sensitivity', e.target.value)}><option value="low">منخفضة (أقل إنذارات)</option><option value="medium">متوسطة</option><option value="high">عالية (أكثر حساسية)</option></select></Field>
      <Field label="فاصل التهدئة بين إنذارين لنفس العضو (دقيقة)"><Num min={1} value={cp.cooldownMin} onChange={(v: number) => up('compromised', 'cooldownMin', v)} /></Field>
      <Field label="رتبة العزل" hint="فارغ = كتم 28 يوماً بدل الرتبة"><RoleSelect guildId={guildId} value={cp.quarantineRoleId ? [cp.quarantineRoleId] : []} onChange={(v) => up('compromised', 'quarantineRoleId', v[v.length - 1] || null)} /></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">🌊 درع الغارات وبوابة عمر الحساب</h3><Toggle label="مفعّل" value={rd.enabled} onChange={(v) => up('raid', 'enabled', v)} />
      <Field label="عدد الحسابات الجديدة"><Num min={2} value={rd.joins} onChange={(v: number) => up('raid', 'joins', v)} /></Field><Field label="خلال (ثانية)"><Num min={5} value={rd.seconds} onChange={(v: number) => up('raid', 'seconds', v)} /></Field>
      <Field label="الحساب «جديد» إذا عمره أقل من (يوم)"><Num min={1} value={rd.newAccountDays} onChange={(v: number) => up('raid', 'newAccountDays', v)} /></Field>
      <div className="md:col-span-2"><Field label="القنوات التي تُقفل عند الغارة"><MultiChannelSelect guildId={guildId} value={rd.lockdownChannelIds} onChange={(v) => up('raid', 'lockdownChannelIds', v)} /></Field></div>
      <Field label="إنهاء القفل تلقائياً بعد (دقيقة، 0 = يدوي فقط)"><Num min={0} value={rd.autoEndMinutes} onChange={(v: number) => up('raid', 'autoEndMinutes', v)} /></Field>
      <Field label="بوابة العمر: أقل عمر للحساب (يوم، 0 = معطّلة)"><Num min={0} value={rd.gateDays} onChange={(v: number) => up('raid', 'gateDays', v)} /></Field>
      <Field label="إجراء البوابة"><select className={inp} value={rd.gateAction} onChange={(e) => up('raid', 'gateAction', e.target.value)}><option value="timeout">كتم 24 ساعة</option><option value="kick">طرد</option></select></Field></section>
    <section className={card}><h3 className="font-bold md:col-span-2">📨 استئناف الحظر</h3><Toggle label="تفعيل صفحة الاستئناف العامة" value={ap.enabled} onChange={(v) => up('appeals', 'enabled', v)} />
      <p className="text-sm text-gray-600" dir="ltr">/appeal/{guildId}</p><div className="md:col-span-2"><Field label="نص تمهيدي يظهر في الصفحة"><textarea className={inp} rows={3} maxLength={1000} value={ap.intro} onChange={(e) => up('appeals', 'intro', e.target.value)} /></Field></div></section>
    {nt.view}<Btn onClick={save}>حفظ الإعدادات</Btn></div>;
}
