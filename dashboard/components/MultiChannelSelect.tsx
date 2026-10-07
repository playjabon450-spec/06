'use client';
import { useEffect, useState } from 'react';
// Multi-select of guild channels (chips + searchable dropdown). Same endpoint/cache as ChannelSelect.
export default function MultiChannelSelect({ guildId, value, onChange, types = [0, 5], placeholder = 'أضف قناة' }: { guildId: string; value: string[]; onChange: (v: string[]) => void; types?: number[]; placeholder?: string }) {
  const [all, setAll] = useState<any[]>([]); const [q, setQ] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { fetch(`/api/guilds/${guildId}/discord/channels`).then(async (r) => (r.ok ? setAll((await r.json()).channels) : setErr('تعذر تحميل القنوات'))); }, [guildId]);
  const name = (id: string) => all.find((c) => c.id === id)?.name || id; const list = all.filter((c) => types.includes(c.type) && !value.includes(c.id) && c.name.includes(q));
  return <div className="space-y-1"><div className="flex flex-wrap gap-1">{value.map((id) => <span key={id} className="bg-sand border rounded-full px-2 py-0.5 text-sm"># {name(id)} <button type="button" onClick={() => onChange(value.filter((x) => x !== id))}>✕</button></span>)}</div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-full border rounded p-1 text-sm" />
    <select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])} className="w-full border rounded p-2 bg-white"><option value="">{placeholder}</option>{list.map((c) => <option key={c.id} value={c.id}># {c.name}</option>)}</select>{err && <p className="text-xs text-red-600">{err}</p>}</div>;
}
