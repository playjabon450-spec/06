'use client';
import { useEffect, useState } from 'react';
import { api, useNotice } from '../store/ui';
const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; const hl = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'ص' : 'م'}`;
export default function BestTimePanel({ guildId }: { guildId: string }) {
  const [d, setD] = useState<any>(null); const nt = useNotice(); useEffect(() => { api(`/api/guilds/${guildId}/insights/heatmap`).then(setD).catch(nt.err); }, []);
  if (!d) return <>{nt.view || <p>...</p>}</>;
  return <div className="space-y-4"><div className="bg-white border rounded-lg p-4"><h3 className="font-bold mb-2">⏰ أفضل أوقات النشر</h3>{d.best.length ? <ol className="list-decimal pr-5 space-y-1">{d.best.map((b: any, i: number) => <li key={i}><b>{WD[b.weekday]}</b> الساعة <b>{hl(b.hour)}</b> <span className="text-xs text-gray-500">({b.count} رسالة في آخر 28 يوماً)</span></li>)}</ol> : <p className="text-gray-500">لا توجد بيانات كافية بعد.</p>}<p className="text-xs text-gray-500 mt-2">بتوقيت السيرفر ({d.tz}).</p></div>
    <div className="bg-white border rounded-lg p-4 overflow-x-auto"><h3 className="font-bold mb-2">خريطة النشاط (آخر 28 يوماً)</h3><div dir="ltr" className="inline-block"><div className="flex ml-16">{Array.from({ length: 24 }, (_, h) => <div key={h} className="w-6 text-[10px] text-center text-gray-500">{h}</div>)}</div>
      {d.grid.map((row: number[], w: number) => <div key={w} className="flex items-center"><div className="w-16 text-xs text-right pr-2" dir="rtl">{WD[w]}</div>{row.map((n, h) => <div key={h} title={`${WD[w]} ${hl(h)}: ${n}`} className="w-6 h-6 border border-white" style={{ background: `rgba(31,111,139,${n ? 0.12 + 0.88 * (n / d.max) : 0.04})` }} />)}</div>)}</div></div></div>;
}
