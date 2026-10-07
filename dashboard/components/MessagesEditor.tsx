'use client';
import { useEffect, useState } from 'react';
export default function MessagesEditor({ guildId, defaults }: { guildId: string; defaults: Record<string, string> }) {
  const [ov, setOv] = useState<Record<string, string>>({}); const [saved, setSaved] = useState('');
  useEffect(() => { fetch(`/api/guilds/${guildId}/messages`).then((r) => r.json()).then((d) => setOv(d.overrides || {})); }, [guildId]);
  async function save(key: string, value: string | null) {
    const r = await fetch(`/api/guilds/${guildId}/messages`, { method: 'PUT', body: JSON.stringify({ key, value }) });
    setSaved(r.ok ? `تم حفظ: ${key}` : 'تعذر الحفظ');
  }
  return <div className="space-y-3 max-w-2xl">{Object.entries(defaults).map(([k, d]) => (
    <div key={k} className="bg-white border rounded-lg p-3"><label className="text-xs text-gray-500" dir="ltr">{k}</label>
      <textarea className="w-full border rounded p-2 mt-1" rows={2} value={ov[k] ?? d} onChange={(e) => setOv({ ...ov, [k]: e.target.value })} />
      <div className="flex gap-2 mt-1"><button className="bg-sea text-white px-3 py-1 rounded" onClick={() => save(k, ov[k] ?? null)}>حفظ</button>
        <button className="px-3 py-1 rounded border" onClick={() => { const n = { ...ov }; delete n[k]; setOv(n); save(k, null); }}>استعادة الافتراضي</button></div></div>))}
    <p className="text-sm">{saved}</p></div>;
}
