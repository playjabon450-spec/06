'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Btn, useNotice } from '../store/ui';
export default function AppealForm({ guildId }: { guildId: string }) {
  const url = `/api/appeal/${guildId}`; const [info, setInfo] = useState<any>(null); const [f, setF] = useState({ whyBanned: '', whyUnban: '', extra: '' }); const [done, setDone] = useState(false); const nt = useNotice(); const [busy, setBusy] = useState(false);
  useEffect(() => { api(url).then(setInfo).catch(nt.err); }, []);
  async function send() { setBusy(true); nt.clear(); try { await api(url, 'POST', f); setDone(true); } catch (e) { nt.err(e); } finally { setBusy(false); } }
  if (!info) return <div className="max-w-xl mx-auto">{nt.view || <p>...</p>}</div>;
  const wait = info.last && (info.last.status === 'pending' || Date.now() < +new Date(info.last.nextAt));
  return <div className="max-w-xl mx-auto bg-white border rounded-lg p-5 space-y-3"><h1 className="text-xl font-bold">استئناف الحظر — {info.guildName}</h1>{info.intro && <p className="text-sm text-gray-600 whitespace-pre-wrap">{info.intro}</p>}
    {done ? <p className="bg-green-50 text-green-700 rounded p-3">✅ تم إرسال استئنافك. سنراجعه ونراسلك بالنتيجة على الخاص إن أمكن.</p>
      : !info.banned ? <p className="bg-yellow-50 text-yellow-800 rounded p-3">حسابك غير محظور في هذا السيرفر.</p>
      : wait ? <p className="bg-yellow-50 text-yellow-800 rounded p-3">{info.last.status === 'pending' ? 'استئنافك قيد المراجعة.' : `رُفض استئنافك السابق${info.last.reason ? `: ${info.last.reason}` : ''}. يمكنك التقديم مجدداً بعد ${new Date(info.last.nextAt).toLocaleDateString('ar-EG')}.`}</p>
      : <><Field label="لماذا حُظرت؟"><textarea className={inp} rows={3} maxLength={1000} value={f.whyBanned} onChange={(e) => setF({ ...f, whyBanned: e.target.value })} /></Field>
        <Field label="لماذا يجب رفع الحظر؟"><textarea className={inp} rows={4} maxLength={1500} value={f.whyUnban} onChange={(e) => setF({ ...f, whyUnban: e.target.value })} /></Field>
        <Field label="ملاحظات إضافية (اختياري)"><textarea className={inp} rows={2} maxLength={1000} value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} /></Field>{nt.view}<Btn disabled={busy} onClick={send}>إرسال الاستئناف</Btn></>}</div>;
}
