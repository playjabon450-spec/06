'use client';
import { useEffect, useState } from 'react';
import { api, Btn, useNotice } from '../store/ui';
export default function RetentionPanel({ guildId }: { guildId: string }) {
  const url = `/api/guilds/${guildId}/insights/retention`; const [d, setD] = useState<any>(null); const nt = useNotice(); const [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => { api(url).then(setD).catch(nt.err); }, []);
  async function renew(id: string) { try { await api(url, 'POST', { subscriptionId: id }); setSent({ ...sent, [id]: true }); nt.ok('تم إرسال التذكير (يصل خلال ثوانٍ إن كان الخاص مفتوحاً)'); } catch (e) { nt.err(e); } }
  if (!d) return <>{nt.view || <p>...</p>}</>;
  return <div className="space-y-5">{nt.view}
    <section className="space-y-2"><h3 className="font-bold">😴 أعضاء نشطون صمتوا منذ {d.churnDays} أيام أو أكثر ({d.churn.length})</h3><p className="text-xs text-gray-500">نشطوا في آخر 30 يوماً (3 أيام نشاط على الأقل) ثم توقفوا. تُضبط المدة من الإعدادات.</p>
      <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['العضو', 'آخر رسالة', 'أيام النشاط (30 يوماً)'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{d.churn.map((c: any) => <tr key={c.userId} className="border-t"><td className="p-2">{c.name} <span className="font-mono text-xs text-gray-400" dir="ltr">{c.userId}</span></td><td className="p-2">{new Date(c.lastMessageAt).toLocaleDateString('ar-EG')}</td><td className="p-2">{c.activeDays}</td></tr>)}{!d.churn.length && <tr><td colSpan={3} className="p-4 text-center text-gray-500">لا يوجد أعضاء معرّضون للمغادرة 👍</td></tr>}</tbody></table></div></section>
    <section className="space-y-2"><h3 className="font-bold">🔔 الاشتراكات: على وشك الانتهاء أو انتهت مؤخراً ({d.subscriptions.length})</h3>
      <div className="bg-white border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sand text-right"><tr>{['العميل', 'المنتج', 'الحالة', 'التاريخ', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{d.subscriptions.map((s: any) => <tr key={s.id} className="border-t"><td className="p-2 font-mono text-xs" dir="ltr">{s.userId}</td><td className="p-2">{s.product}</td><td className="p-2">{s.state === 'expiring' ? '⏳ ينتهي قريباً' : '⌛ انتهى'}</td><td className="p-2">{new Date(s.expiresAt).toLocaleDateString('ar-EG')}</td>
          <td className="p-2"><Btn disabled={!s.canRenew || sent[s.id]} onClick={() => renew(s.id)}>{sent[s.id] ? 'أُرسل ✓' : 'إرسال تذكير تجديد'}</Btn></td></tr>)}{!d.subscriptions.length && <tr><td colSpan={5} className="p-4 text-center text-gray-500">لا توجد اشتراكات قريبة الانتهاء</td></tr>}</tbody></table></div></section></div>;
}
