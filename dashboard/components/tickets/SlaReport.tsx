'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, useNotice } from '../store/ui';
const m = (v: number | null) => (v == null ? '—' : v >= 120 ? `${Math.round(v / 60)} س` : `${v} د`);
export default function SlaReport({ guildId }: { guildId: string }) {
  const [days, setDays] = useState(30); const [d, setD] = useState<any>(null); const nt = useNotice();
  useEffect(() => { api(`/api/guilds/${guildId}/tickets/sla?days=${days}`).then(setD).catch(nt.err); }, [days]);
  return <div className="space-y-3"><div className="max-w-xs"><Field label="الفترة"><select className={inp} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90].map((x) => <option key={x} value={x}>آخر {x} يوم</option>)}</select></Field></div>{nt.view}
    {d && <><div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['القسم', 'التذاكر', 'مفتوحة', 'متوسط أول رد', 'الحد', 'متوسط الحل', 'الحد', 'تجاوز أول رد', 'تجاوز الحل', 'التقييم'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{d.rows.map((r: any) => <tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.total}</td><td className="p-2">{r.open}</td><td className="p-2">{m(r.avgFirstResponse)}</td><td className="p-2">{m(r.firstResponseMin)}</td><td className="p-2">{m(r.avgResolution)}</td><td className="p-2">{m(r.resolutionMin)}</td>
        <td className={`p-2 ${r.frBreaches ? 'text-red-600 font-bold' : ''}`}>{r.frBreaches}</td><td className={`p-2 ${r.resBreaches ? 'text-red-600 font-bold' : ''}`}>{r.resBreaches}</td><td className="p-2">{r.avgRating ? `⭐ ${r.avgRating}` : '—'}</td></tr>)}</tbody></table></div>
      <h3 className="font-bold">التذاكر المتجاوزة ({d.breached.length})</h3><div className="flex flex-wrap gap-2">{d.breached.map((b: any) => <span key={b.id} className="bg-red-50 text-red-700 rounded px-2 py-1 text-sm">#{b.number} · {b.category}{b.fr ? ' · أول رد' : ''}{b.res ? ' · الحل' : ''}</span>)}{!d.breached.length && <span className="text-gray-500">لا توجد تجاوزات 🎉</span>}</div></>}</div>;
}
