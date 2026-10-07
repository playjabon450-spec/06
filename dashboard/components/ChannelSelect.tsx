'use client';
import { useEffect, useState } from 'react';
// types: 0 text, 4 category, 5 announcement. Default = text channels.
export default function ChannelSelect({ guildId, value, onChange, types = [0, 5], placeholder = 'اختر قناة' }: { guildId: string; value: string | null; onChange: (v: string | null) => void; types?: number[]; placeholder?: string }) {
  const [all, setAll] = useState<any[]>([]); const [q, setQ] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { fetch(`/api/guilds/${guildId}/discord/channels`).then(async (r) => (r.ok ? setAll((await r.json()).channels) : setErr('تعذر تحميل القنوات، تأكد من DISCORD_TOKEN ووجود البوت في السيرفر'))); }, [guildId]);
  const list = all.filter((c) => types.includes(c.type) && c.name.includes(q));
  return <div className="space-y-1"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-full border rounded p-1 text-sm" />
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} className="w-full border rounded p-2 bg-white">
      <option value="">{placeholder}</option>{list.map((c) => <option key={c.id} value={c.id}>{c.type === 4 ? '📁 ' : '# '}{c.name}{c.parent ? ` (${c.parent})` : ''}</option>)}</select>
    {err && <p className="text-xs text-red-600">{err}</p>}</div>;
}
