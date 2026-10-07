'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from './ChannelSelect';
import RoleSelect from './RoleSelect';
const KINDS: [string, string][] = [['general', 'السجل العام'], ['orders', 'سجل الطلبات'], ['tickets', 'سجل التذاكر'], ['shield', 'تنبيهات الحماية'], ['staff', 'قناة الستاف']];
const MODS: [string, string][] = [['store', 'المتجر'], ['tickets', 'التذاكر'], ['shield', 'الحماية'], ['staff', 'أدوات الستاف'], ['insights', 'التحليلات']];
const TZ = ['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baghdad', 'Africa/Casablanca', 'Europe/London', 'UTC'];
export default function SettingsForm({ guildId }: { guildId: string }) {
  const [s, setS] = useState<any>(null); const [msg, setMsg] = useState('');
  useEffect(() => { fetch(`/api/guilds/${guildId}/settings`).then((r) => r.json()).then(setS); }, [guildId]);
  if (!s) return <p>جارٍ التحميل...</p>;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  async function save() {
    setMsg('...');
    const r = await fetch(`/api/guilds/${guildId}/settings`, { method: 'PUT', body: JSON.stringify(s) });
    setMsg(r.ok ? 'تم الحفظ، سيصل التغيير للبوت خلال ثوانٍ' : (await r.json()).error);
  }
  const box = 'bg-white border rounded-lg p-4 space-y-2';
  return <div className="max-w-2xl space-y-4">
    <section className={box}><h2 className="font-bold">رتب الستاف</h2><RoleSelect guildId={guildId} value={s.staffRoleIds} onChange={(v) => set('staffRoleIds', v)} /></section>
    <section className={box}><h2 className="font-bold">رتب الدخول للوحة التحكم</h2><RoleSelect guildId={guildId} value={s.dashboardRoleIds} onChange={(v) => set('dashboardRoleIds', v)} /></section>
    <section className={box}><h2 className="font-bold">قنوات السجلات</h2>
      {KINDS.map(([k, l]) => <div key={k}><label className="text-sm">{l}</label><ChannelSelect guildId={guildId} value={s.logChannels[k] || null} onChange={(v) => set('logChannels', { ...s.logChannels, [k]: v })} /></div>)}</section>
    <section className={box}><h2 className="font-bold">تفعيل الميزات</h2>
      {MODS.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={s.modules[k] ?? true} onChange={(e) => set('modules', { ...s.modules, [k]: e.target.checked })} />{l}</label>)}</section>
    <section className={box + ' flex gap-6 flex-wrap'}>
      <label>لون الهوية <input type="color" value={s.themeColor} onChange={(e) => set('themeColor', e.target.value)} className="mr-2" /></label>
      <label>المنطقة الزمنية <select value={s.timezone} onChange={(e) => set('timezone', e.target.value)} className="border rounded p-1 mr-2">{TZ.map((z) => <option key={z}>{z}</option>)}</select></label></section>
    <button onClick={save} className="bg-sea text-white px-5 py-2 rounded">حفظ الإعدادات</button> <span className="text-sm">{msg}</span></div>;
}
