'use client';
import { useEffect, useState } from 'react';
export default function RoleSelect({ guildId, value, onChange }: { guildId: string; value: string[]; onChange: (v: string[]) => void }) {
  const [all, setAll] = useState<any[]>([]); const [q, setQ] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { fetch(`/api/guilds/${guildId}/discord/roles`).then(async (r) => (r.ok ? setAll((await r.json()).roles) : setErr('تعذر تحميل الرتب'))); }, [guildId]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return <div className="space-y-1"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن رتبة..." className="w-full border rounded p-1 text-sm" />
    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto border rounded p-1 bg-white">
      {all.filter((r) => value.includes(r.id) || r.name.includes(q)).map((r) => <button type="button" key={r.id} onClick={() => toggle(r.id)} className={`px-2 py-0.5 rounded-full text-sm border ${value.includes(r.id) ? 'bg-sea text-white' : 'bg-sand'}`}>{r.name}</button>)}</div>
    {err && <p className="text-xs text-red-600">{err}</p>}</div>;
}
