'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from './ChannelSelect';
import RoleSelect from './RoleSelect';
import { api, Field, Btn, useNotice } from './store/ui';
const LOGS: [string, string][] = [['general', 'السجل العام'], ['orders', 'الطلبات'], ['tickets', 'التذاكر'], ['shield', 'الحماية'], ['staff', 'الستاف']];
export default function SetupWizard({ guildId }: { guildId: string }) {
  const [d, setD] = useState<any>(null); const [s, setS] = useState<any>(null); const nt = useNotice(); const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api(`/api/guilds/${guildId}/setup`), api(`/api/guilds/${guildId}/settings`)]).then(([a, b]) => { setD(a); setS(b); }).catch(nt.err);
  useEffect(() => { load(); const f = () => load(); window.addEventListener('focus', f); return () => window.removeEventListener('focus', f); }, []);
  async function save(next: any, msg: string) { setBusy(true); nt.clear(); try { await api(`/api/guilds/${guildId}/settings`, 'PUT', next); setS(next); nt.ok(msg); await load(); } catch (e) { nt.err(e); } finally { setBusy(false); } }
  if (!d || !s) return <>{nt.view || <p>...</p>}</>; const cur = d.steps.findIndex((x: any) => !x.done); const pct = Math.round((d.done / d.total) * 100);
  return <div className="max-w-3xl space-y-4"><div className="bg-white border rounded-lg p-4"><div className="flex justify-between text-sm mb-2"><b>التقدم في الإعداد</b><span>{d.done} / {d.total}</span></div><div className="h-3 bg-sand rounded"><div className="h-3 rounded bg-sea transition-all" style={{ width: `${pct}%` }} /></div>
    {d.done === d.total && <p className="mt-3 text-green-700 text-sm">🎉 اكتمل الإعداد الأساسي! جرّب دورة طلب كاملة كما في دليل الاختبار، وراجع قائمة الجاهزية للإنتاج.</p>}</div>{nt.view}
    {d.steps.map((st: any, i: number) => <section key={st.key} className={`bg-white border rounded-lg p-4 space-y-3 ${i === cur ? 'ring-2 ring-sea' : ''}`}>
      <div className="flex items-start gap-3"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${st.done ? 'bg-green-600 text-white' : i === cur ? 'bg-sea text-white' : 'bg-sand'}`}>{st.done ? '✓' : i + 1}</span><div className="flex-1"><b>{st.title}</b>{i === cur && <span className="mr-2 text-xs bg-sea text-white rounded px-2 py-0.5">الخطوة التالية</span>}<p className="text-sm text-gray-600">{st.desc}</p></div>
        {st.href && <a className="border rounded px-3 py-1.5 text-sm bg-white shrink-0" href={`/${guildId}${st.href}`}>فتح الصفحة ←</a>}</div>
      {st.key === 'roles' && <div className="space-y-2"><RoleSelect guildId={guildId} value={s.staffRoleIds} onChange={(v) => setS({ ...s, staffRoleIds: v })} /><Btn disabled={busy} onClick={() => save(s, 'تم حفظ رتب الستاف')}>حفظ الرتب</Btn></div>}
      {st.key === 'logs' && <div className="space-y-2"><div className="grid md:grid-cols-2 gap-3">{LOGS.map(([k, l]) => <Field key={k} label={l}><ChannelSelect guildId={guildId} value={s.logChannels?.[k] || null} onChange={(v) => setS({ ...s, logChannels: { ...s.logChannels, [k]: v } })} /></Field>)}</div><Btn disabled={busy} onClick={() => save(s, 'تم حفظ قنوات السجلات')}>حفظ القنوات</Btn></div>}
    </section>)}</div>;
}
