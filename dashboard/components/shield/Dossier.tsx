'use client';
import { useEffect, useState } from 'react';
import { api, inp, Field, Btn, useNotice } from '../store/ui';
const ICON: any = { incident: '🛡️', note: '📝', order: '🛒', ticket: '🎫', appeal: '📨', join: '🚪' };
export default function Dossier({ guildId, initial }: { guildId: string; initial?: string }) {
  const url = `/api/guilds/${guildId}/shield/dossier`; const [q, setQ] = useState(initial || ''); const [d, setD] = useState<any>(null); const [note, setNote] = useState(''); const nt = useNotice();
  const load = (id = q) => { nt.clear(); return api(`${url}?userId=${id.trim()}`).then(setD).catch((e) => { setD(null); nt.err(e); }); };
  useEffect(() => { if (initial) { setQ(initial); load(initial); } }, [initial]);
  async function add() { try { await api(url, 'POST', { userId: d.userId, text: note }); setNote(''); load(d.userId); } catch (e) { nt.err(e); } }
  async function rm(id: string) { try { await api(`${url}?id=${id}`, 'DELETE'); load(d.userId); } catch (e) { nt.err(e); } }
  return <div className="space-y-3"><div className="flex gap-2 items-end max-w-md"><div className="flex-1"><Field label="ID العضو"><input dir="ltr" className={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} /></Field></div><Btn onClick={() => load()}>بحث</Btn></div>{nt.view}
    {d && <div className="grid lg:grid-cols-3 gap-4"><div className="space-y-3"><div className="bg-white border rounded-lg p-4 space-y-2"><div className="flex items-center gap-3">{d.avatar && <img src={d.avatar} className="w-12 h-12 rounded-full" alt="" />}<div><b>{d.username}</b><div className="text-xs font-mono" dir="ltr">{d.userId}</div></div></div>
      <div className="text-sm">الانضمام: {d.inGuild ? new Date(d.joinedAt).toLocaleDateString('ar-EG') : 'غير موجود في السيرفر'}</div>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">{[['حوادث', d.counts.incidents], ['طلبات', d.counts.orders], ['المنفق', d.counts.spent], ['تذاكر', d.counts.tickets], ['استئنافات', d.counts.appeals]].map(([l, v]) => <div key={l as string} className="bg-sand rounded p-2"><div className="font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>)}</div></div>
      <div className="bg-white border rounded-lg p-4 space-y-2"><h3 className="font-bold">ملاحظات الستاف</h3><textarea className={inp} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /><Btn disabled={!note.trim()} onClick={add}>إضافة ملاحظة</Btn>
        {d.notes.map((n: any) => <div key={n.id} className="text-sm border-t pt-1 flex justify-between gap-2"><span>{n.text} <span className="text-xs text-gray-400" dir="ltr">({n.authorId})</span></span><button className="text-red-600 text-xs" onClick={() => rm(n.id)}>حذف</button></div>)}</div></div>
      <div className="lg:col-span-2 bg-white border rounded-lg p-4"><h3 className="font-bold mb-2">الخط الزمني</h3><div className="space-y-2 max-h-[32rem] overflow-y-auto">{d.timeline.map((t: any, i: number) => <div key={i} className="text-sm flex gap-2"><span>{ICON[t.type]}</span><span className="flex-1">{t.text}</span><span className="text-xs text-gray-400">{new Date(t.at).toLocaleString('ar-EG')}</span></div>)}{!d.timeline.length && <p className="text-gray-500">لا يوجد نشاط مسجل.</p>}</div></div></div>}</div>;
}
