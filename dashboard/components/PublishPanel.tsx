'use client';
import { useState } from 'react';
import ChannelSelect from './ChannelSelect';
export default function PublishPanel({ guildId }: { guildId: string }) {
  const [ch, setCh] = useState<string | null>(''); const [msg, setMsg] = useState('');
  async function go() {
    setMsg('...');
    const r = await fetch(`/api/guilds/${guildId}/general/publish`, { method: 'POST', body: JSON.stringify({ module: 'general', panel: 'welcome', channelId: ch || '' }) });
    setMsg(r.ok ? 'تم إرسال الطلب، سيظهر في ديسكورد خلال ثوانٍ' : (await r.json()).error);
  }
  return <div className="bg-white border rounded-lg p-4 max-w-md space-y-3"><h2 className="font-bold">نشر / تحديث رسالة الترحيب</h2>
    <ChannelSelect guildId={guildId} value={ch} onChange={setCh} />
    <button onClick={go} className="bg-sea text-white px-4 py-2 rounded">نشر / تحديث</button><p className="text-sm">{msg}</p></div>;
}
