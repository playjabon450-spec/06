// Pure scoring: server health (0-100) with explanation + 3 tips, and best posting times from a heatmap.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n)); const r1 = (n) => Math.round(n * 10) / 10;
const TIPS = {
  activity: 'نشّط الأعضاء: ابدأ نقاشات يومية أو فعاليات أسبوعية في أنشط القنوات، وانشر في أوقات الذروة.',
  retention: 'قلّل المغادرة: راجع تجربة الانضمام (رسالة ترحيب واضحة، قنوات مرتبة) وتواصل مع الأعضاء الذين صمتوا مؤخراً.',
  support: 'حسّن الدعم: ارفع سرعة أول رد وأغلق التذاكر المفتوحة، وأضف مقالات لقاعدة المعرفة للأسئلة المتكررة.',
  safety: 'عزّز الأمان: فعّل حاجز الروابط وبوابة عمر الحساب، وراجع إعدادات الحماية بعد كل حادثة.',
  commerce: 'ارفع التحويل: بسّط خطوات الطلب، وفّر طرق دفع أكثر، وجرّب كوبون خصم للطلبات المتروكة.',
};
const LABEL = { activity: 'النشاط', retention: 'النمو والاحتفاظ', support: 'جودة الدعم', safety: 'الأمان', commerce: 'المتجر' };
// m: { members, joined, left, activeAvg, ticketsOpened, ticketsClosed, avgRating, avgFirstResponse, shieldIncidents, orders, paidOrders, hasStore, hasTickets }
function healthScore(m) {
  const mem = Math.max(1, m.members || 0); const parts = [];
  const ratio = (m.activeAvg || 0) / mem; parts.push({ key: 'activity', max: 30, score: clamp((ratio / 0.1) * 30, 0, 30), note: `متوسط النشطين يومياً ${r1(ratio * 100)}% من الأعضاء (الهدف 10%)` });
  const growth = ((m.joined || 0) - (m.left || 0)) / mem; parts.push({ key: 'retention', max: 25, score: clamp(15 + clamp(growth * 200, -15, 10), 0, 25), note: `انضم ${m.joined || 0} وغادر ${m.left || 0} (صافي ${(m.joined || 0) - (m.left || 0)})` });
  if (m.hasTickets) { const cr = Math.min(1, (m.ticketsClosed || 0) / Math.max(1, m.ticketsOpened || 0)); const rt = m.avgRating ? ((m.avgRating - 1) / 4) * 6 : 3; const fr = m.avgFirstResponse == null ? 2 : m.avgFirstResponse <= 15 ? 4 : m.avgFirstResponse <= 60 ? 2 : 0;
    parts.push({ key: 'support', max: 20, score: clamp(10 * cr + rt + fr, 0, 20), note: `أُغلقت ${m.ticketsClosed || 0} من ${m.ticketsOpened || 0} تذكرة${m.avgRating ? ` · تقييم ${r1(m.avgRating)}/5` : ''}${m.avgFirstResponse != null ? ` · أول رد ${Math.round(m.avgFirstResponse)} د` : ''}` }); }
  const per1k = ((m.shieldIncidents || 0) / mem) * 1000; parts.push({ key: 'safety', max: 15, score: clamp(15 - per1k * 2, 0, 15), note: `${m.shieldIncidents || 0} حادثة حماية (${r1(per1k)} لكل 1000 عضو)` });
  if (m.hasStore) { const conv = (m.paidOrders || 0) / Math.max(1, m.orders || 0); parts.push({ key: 'commerce', max: 10, score: m.orders ? clamp((conv / 0.5) * 10, 0, 10) : 5, note: m.orders ? `تحويل الطلبات ${r1(conv * 100)}% (${m.paidOrders || 0}/${m.orders})` : 'لا توجد طلبات في الفترة' }); }
  const max = parts.reduce((a, p) => a + p.max, 0); const score = Math.round((parts.reduce((a, p) => a + p.score, 0) / max) * 100);
  const out = parts.map((p) => ({ ...p, score: r1(p.score), label: LABEL[p.key] })); const tips = [...out].sort((a, b) => a.score / a.max - b.score / b.max).slice(0, 3).map((p) => TIPS[p.key]);
  const generic = ['حافظ على تجربة ترحيب جيدة للأعضاء الجدد.', 'راجع التقرير الأسبوعي وحدّد هدفاً واحداً للأسبوع القادم.', 'اسأل الأعضاء عن رأيهم عبر استطلاع قصير.']; for (const g of generic) if (tips.length < 3) tips.push(g);
  return { score, level: score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : score >= 40 ? 'يحتاج تحسيناً' : 'ضعيف', parts: out, tips };
}
// cells: [{ weekday 0-6, hour 0-23, count }] -> top N [{ weekday, hour, count }] (ties: earlier first)
function bestTimes(cells, top = 3) { const m = new Map(); for (const c of cells) { const k = c.weekday * 24 + c.hour; m.set(k, (m.get(k) || 0) + c.count); }
  return [...m.entries()].map(([k, count]) => ({ weekday: Math.floor(k / 24), hour: k % 24, count })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count || (a.weekday * 24 + a.hour) - (b.weekday * 24 + b.hour)).slice(0, top); }
const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'ص' : 'م'}`;
module.exports = { healthScore, bestTimes, WD, hourLabel };
