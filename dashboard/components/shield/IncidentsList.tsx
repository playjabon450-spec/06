'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Btn, useNotice } from '../store/ui';
const KIND: any = { scam_link: '🔗 رابط احتيالي', compromised: '🚨 حساب مخترق', raid: '🌊 غارة', gate: '🚪 بوابة العمر', appeal: '📨 استئناف', manual: '✋ يدوي' };
export default function IncidentsList({ guildId, onUser }: { guildId: string; onUser: (id: string) => void }) {
  const base = `/api/guilds/${guildId}/shield/incidents`; const [kind, setKind] = useState(''); const [user, setUser] = useState(''); const [page, setPage] = useState(1); const [d, setD] = useState<any>({ incidents: [], pages: 1, week: {} }); const nt = useNotice();
  const load = (p = page) => api(`${base}?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(user ? { user } : {}), page: String(p) })}`).then(setD).catch(nt.err);
  useEffect(() => { setPage(1); load(1); }, [kind]); useEffect(() => { load(page); }, [page]);
  return <div className="space-y-3"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(KIND).slice(0, 4).map(([k, l]) => <div key={k} className="bg-white border rounded-lg p-3 text-center"><div className="text-2xl font-bold">{d.week?.[k] || 0}</div><div className="text-xs text-gray-500">{l as string} (7 أيام)</div></div>)}</div>
    <div className="bg-white border rounded-lg p-3 grid md:grid-cols-3 gap-2"><Field label="النوع"><select className={inp} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">الكل</option>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}</select></Field>
      <Field label="ID العضو"><input className={inp} value={user} onChange={(e) => setUser(e.target.value.trim())} onKeyDown={(e) => e.key === 'Enter' && load(1)} /></Field></div>{nt.view}
    <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['النوع', 'العضو', 'الإجراء', 'الدرجة', 'التفاصيل', 'الوقت'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
      <tbody>{d.incidents.map((i: any) => <tr key={i.id} className="border-t"><td className="p-2">{KIND[i.kind] || i.kind}</td><td className="p-2"><button className="font-mono text-xs text-blue-700 underline" dir="ltr" onClick={() => onUser(i.userId)}>{i.userId}</button></td><td className="p-2">{i.action}</td><td className="p-2">{i.score || '—'}</td>
        <td className="p-2 text-xs text-gray-600 max-w-xs truncate" dir="ltr">{i.details?.host || (i.details?.reasons || []).join(', ') || ''}</td><td className="p-2 text-xs">{new Date(i.createdAt).toLocaleString('ar-EG')}</td></tr>)}{!d.incidents.length && <tr><td colSpan={6} className="p-6 text-center text-gray-500">لا توجد حوادث 👍</td></tr>}</tbody></table></div>
    <div className="flex gap-2 justify-center items-center"><Btn kind="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Btn><span className="text-sm">{page} / {d.pages}</span><Btn kind="ghost" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>التالي</Btn></div></div>;
}
