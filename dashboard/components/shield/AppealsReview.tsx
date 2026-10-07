'use client';
import { useEffect, useState } from 'react';
import { api, inp, Btn, useNotice } from '../store/ui';
const ST: any = { pending: '⏳ قيد المراجعة', accepted: '✅ مقبول', rejected: '❌ مرفوض' };
export default function AppealsReview({ guildId, onUser }: { guildId: string; onUser: (id: string) => void }) {
  const url = `/api/guilds/${guildId}/shield/appeals`; const [status, setStatus] = useState('pending'); const [list, setList] = useState<any[]>([]); const [reason, setReason] = useState<Record<string, string>>({}); const nt = useNotice();
  const load = () => api(`${url}?status=${status}`).then((j) => setList(j.appeals)).catch(nt.err); useEffect(() => { load(); }, [status]);
  async function decide(id: string, decision: string) { try { await api(url, 'PATCH', { id, decision, reason: reason[id] || '' }); nt.ok('تم إرسال القرار، سيُنفّذه البوت خلال ثوانٍ'); setTimeout(load, 2500); } catch (e) { nt.err(e); } }
  return <div className="space-y-3"><div className="flex gap-2">{['pending', 'accepted', 'rejected', ''].map((s) => <Btn key={s} kind={status === s ? 'primary' : 'ghost'} onClick={() => setStatus(s)}>{s ? ST[s] : 'الكل'}</Btn>)}</div>{nt.view}
    {!list.length && <p className="text-gray-500">لا توجد استئنافات.</p>}
    {list.map((a) => <div key={a.id} className="bg-white border rounded-lg p-4 space-y-2 text-sm"><div className="flex justify-between"><button className="font-bold underline" onClick={() => onUser(a.userId)}>{a.username || a.userId}</button><span>{ST[a.status]} · {new Date(a.createdAt).toLocaleString('ar-EG')}</span></div>
      <div><b>لماذا حُظر؟</b><p className="whitespace-pre-wrap">{a.answers?.whyBanned}</p></div><div><b>لماذا يُرفع الحظر؟</b><p className="whitespace-pre-wrap">{a.answers?.whyUnban}</p></div>{a.answers?.extra && <div><b>ملاحظات:</b> {a.answers.extra}</div>}
      {a.status === 'pending' ? <div className="flex flex-wrap gap-2 items-center"><input className={`${inp} max-w-xs`} placeholder="السبب (إجباري عند الرفض)" value={reason[a.id] || ''} onChange={(e) => setReason({ ...reason, [a.id]: e.target.value })} /><Btn onClick={() => decide(a.id, 'accepted')}>قبول (رفع الحظر)</Btn><Btn kind="danger" onClick={() => decide(a.id, 'rejected')}>رفض</Btn></div>
        : <div className="text-gray-600">قرار: <span dir="ltr">{a.reviewedBy}</span> {a.reviewReason && `— ${a.reviewReason}`}</div>}</div>)}</div>;
}
