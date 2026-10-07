'use client';
import { useEffect, useState } from 'react';
import { api, Btn, useNotice } from '../store/ui';
export default function HealthPanel({ guildId }: { guildId: string }) {
  const [d, setD] = useState<any>(null); const nt = useNotice(); useEffect(() => { api(`/api/guilds/${guildId}/insights/overview?days=14`).then(setD).catch(nt.err); }, []);
  async function act(action: string) { try { await api(`/api/guilds/${guildId}/insights/settings`, 'POST', { action }); nt.ok(action === 'digest' ? 'تم طلب إرسال الملخص الآن' : 'تم طلب إعادة التجميع'); } catch (e) { nt.err(e); } }
  if (!d) return <>{nt.view || <p>...</p>}</>; const h = d.health; const col = !h ? '#999' : h.score >= 80 ? '#27ae60' : h.score >= 60 ? '#2980b9' : h.score >= 40 ? '#e67e22' : '#c0392b';
  return <div className="space-y-4 max-w-3xl">{nt.view}
    {!h ? <p className="bg-yellow-50 text-yellow-800 rounded p-3 text-sm">لم تُحسب درجة الصحة بعد؛ تُحسب بعد أول تجميع ليلي.</p> : <>
      <div className="bg-white border rounded-lg p-5 flex items-center gap-6"><div className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: col }}>{h.score}</div><div><div className="text-xl font-bold">صحة السيرفر: {h.level}</div><p className="text-sm text-gray-600">من 100، محسوبة على آخر 14 يوماً.</p></div></div>
      <div className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">التفسير</h3>{h.parts.map((p: any) => <div key={p.key}><div className="flex justify-between text-sm"><span>{p.label}</span><span>{p.score}/{p.max}</span></div><div className="h-2 bg-sand rounded"><div className="h-2 rounded" style={{ width: `${(p.score / p.max) * 100}%`, background: col }} /></div><p className="text-xs text-gray-500 mt-1">{p.note}</p></div>)}</div>
      <div className="bg-white border rounded-lg p-4"><h3 className="font-bold mb-2">💡 3 نصائح للتحسين</h3><ol className="list-decimal pr-5 space-y-1 text-sm">{h.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ol></div></>}
    <div className="flex flex-wrap gap-2 items-center"><Btn onClick={() => act('digest')}>إرسال الملخص الأسبوعي الآن</Btn><Btn kind="ghost" onClick={() => act('aggregate')}>إعادة تجميع بيانات الأمس</Btn>{d.digestAt && <span className="text-xs text-gray-500">آخر ملخص: {new Date(d.digestAt).toLocaleString('ar-EG')}</span>}</div></div>;
}
