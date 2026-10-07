'use client';
import { useEffect, useState } from 'react';
import ChannelSelect from '../ChannelSelect';
import RoleSelect from '../RoleSelect';
import { api, inp, Field, Toggle, Num, Btn, useNotice } from './ui';
const blank = () => ({ name: '', description: '', image: '', category: '', active: true, sortOrder: 0, stockMode: 'unlimited', stockCount: 0, deliveryType: 'manual',
  delivery: { lowStockThreshold: 5 } as any, packages: [{ name: 'شهري', priceEgp: 0, priceUsd: null, durationDays: 30, badge: '', active: true, sortOrder: 0, priceOverrides: {} }] as any[], questions: [] as any[] } as any);
const STOCK = { unlimited: 'غير محدود', limited: 'كمية محدودة', keys: 'من مخزون المفاتيح' }, DELIV = { role: 'رتبة تلقائية', key: 'مفتاح من المخزون', message: 'رسالة / رابط خاص', manual: 'يدوي (الموظف يسلّم)' };
const QT = { short: 'نص قصير', text: 'نص طويل', number: 'رقم', select: 'قائمة اختيار' };
export default function ProductsManager({ guildId }: { guildId: string }) {
  const base = `/api/guilds/${guildId}/store`; const [list, setList] = useState<any[]>([]); const [methods, setMethods] = useState<any[]>([]);
  const [ed, setEd] = useState<any | null>(null); const [busy, setBusy] = useState(false); const nt = useNotice();
  const load = () => api(`${base}/products`).then((j) => { setList(j.products); setMethods(j.methods); }).catch(nt.err);
  useEffect(() => { load(); }, []);
  const up = (k: string, v: any) => setEd((e: any) => ({ ...e, [k]: v })); const upd = (k: string, v: any) => setEd((e: any) => ({ ...e, delivery: { ...e.delivery, [k]: v } }));
  const setArr = (k: 'packages' | 'questions', i: number, patch: any) => setEd((e: any) => ({ ...e, [k]: e[k].map((x: any, j: number) => (j === i ? { ...x, ...patch } : x)) }));
  async function save() {
    setBusy(true); nt.clear();
    try {
      const b = { ...ed, image: ed.image || null, category: ed.category || null, packages: ed.packages.map((p: any, i: number) => ({ ...p, sortOrder: i, priceUsd: p.priceUsd || null, durationDays: p.durationDays || null, badge: p.badge || null })), questions: ed.questions.map((q: any, i: number) => ({ ...q, sortOrder: i })) };
      delete b.keysAvailable; delete b.keysUsed; delete b.createdAt; delete b.guildId; delete b.lowStockAlertedAt;
      const r = await api(`${base}/products`, 'POST', b); nt.ok('تم الحفظ'); await load(); setEd(null); void r;
    } catch (e) { nt.err(e); } finally { setBusy(false); }
  }
  async function del(p: any) { if (!confirm(`حذف المنتج «${p.name}» نهائياً؟ (الطلبات القديمة تبقى محفوظة)`)) return; try { await api(`${base}/products?id=${p.id}`, 'DELETE'); nt.ok('تم الحذف'); load(); } catch (e) { nt.err(e); } }
  async function toggle(p: any) { try { const { keysAvailable, keysUsed, createdAt, guildId: _g, lowStockAlertedAt, ...rest } = p; await api(`${base}/products`, 'POST', { ...rest, active: !p.active }); load(); } catch (e) { nt.err(e); } }
  if (ed) return <div className="space-y-4 max-w-3xl">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{ed.id ? 'تعديل منتج' : 'منتج جديد'}</h2><Btn kind="ghost" onClick={() => setEd(null)}>رجوع للقائمة</Btn></div>
    {nt.view}
    <section className="bg-white border rounded-lg p-4 grid md:grid-cols-2 gap-3">
      <Field label="اسم المنتج"><input className={inp} value={ed.name} maxLength={80} onChange={(e) => up('name', e.target.value)} /></Field>
      <Field label="التصنيف"><input className={inp} value={ed.category || ''} maxLength={40} onChange={(e) => up('category', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field label="الوصف"><textarea className={inp} rows={3} maxLength={1000} value={ed.description} onChange={(e) => up('description', e.target.value)} /></Field></div>
      <Field label="رابط الصورة" hint="رابط مباشر https://"><input className={inp} dir="ltr" value={ed.image || ''} onChange={(e) => up('image', e.target.value)} /></Field>
      <Field label="ترتيب العرض"><Num value={ed.sortOrder} onChange={(v: number) => up('sortOrder', v)} /></Field>
      <Toggle label="المنتج مفعّل (ظاهر للعملاء)" value={ed.active} onChange={(v) => up('active', v)} />
    </section>
    <section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">المخزون</h3>
      <div className="grid md:grid-cols-2 gap-3"><Field label="نوع المخزون"><select className={inp} value={ed.stockMode} onChange={(e) => up('stockMode', e.target.value)}>{Object.entries(STOCK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {ed.stockMode === 'limited' && <Field label="الكمية المتاحة"><Num min={0} value={ed.stockCount} onChange={(v: number) => up('stockCount', v)} /></Field>}</div>
      {ed.stockMode !== 'unlimited' && <div className="grid md:grid-cols-2 gap-3"><Field label="حد التنبيه عند انخفاض المخزون" hint="0 = بدون تنبيه"><Num min={0} value={ed.delivery.lowStockThreshold ?? 5} onChange={(v: number) => upd('lowStockThreshold', v)} /></Field>
        <Field label="قناة التنبيه" hint="اتركها فارغة لاستخدام قناة سجل الطلبات"><ChannelSelect guildId={guildId} value={ed.delivery.alertChannelId || null} onChange={(v) => upd('alertChannelId', v)} /></Field></div>}
      {ed.stockMode === 'keys' && (ed.id ? <KeysBox guildId={guildId} product={ed} onChange={load} /> : <p className="text-sm text-gray-500">احفظ المنتج أولاً ثم أضف المفاتيح.</p>)}
    </section>
    <section className="bg-white border rounded-lg p-4 space-y-3"><h3 className="font-bold">طريقة التسليم</h3>
      <Field label="نوع التسليم"><select className={inp} value={ed.deliveryType} onChange={(e) => up('deliveryType', e.target.value)}>{Object.entries(DELIV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      {ed.deliveryType === 'role' && <div className="space-y-2"><Field label="الرتبة الممنوحة"><RoleSelect guildId={guildId} value={ed.delivery.roleId ? [ed.delivery.roleId] : []} onChange={(v) => upd('roleId', v[v.length - 1] || '')} /></Field>
        <Toggle label="رتبة مؤقتة (تُسحب بعد انتهاء المدة)" value={!!ed.delivery.temporary} onChange={(v) => upd('temporary', v)} />
        {ed.delivery.temporary && <Field label="المدة بالأيام (تُستبدل بمدة الباقة إن وُجدت)"><Num min={1} value={ed.delivery.durationDays} onChange={(v: number) => upd('durationDays', v)} /></Field>}</div>}
      {ed.deliveryType === 'key' && <p className="text-sm text-gray-600">يُسلَّم مفتاح واحد من المخزون لكل طلب (بدون تكرار). اختر «من مخزون المفاتيح» في نوع المخزون.</p>}
      {ed.deliveryType === 'message' && <Field label="نص الرسالة" hint="المتغيرات: {user} {order_id} {product}"><textarea className={inp} rows={4} maxLength={1800} value={ed.delivery.message || ''} onChange={(e) => upd('message', e.target.value)} /></Field>}
      {ed.deliveryType === 'manual' && <p className="text-sm text-gray-600">سيصل الموظفين إشعار بزر «تم التسليم» بعد الدفع.</p>}
    </section>
    <section className="bg-white border rounded-lg p-4 space-y-3"><div className="flex justify-between"><h3 className="font-bold">الباقات والأسعار</h3><Btn kind="ghost" onClick={() => up('packages', [...ed.packages, { name: '', priceEgp: 0, priceUsd: null, durationDays: null, badge: '', active: true, sortOrder: ed.packages.length, priceOverrides: {} }])}>+ باقة</Btn></div>
      {ed.packages.map((p: any, i: number) => <div key={i} className="border rounded p-3 grid md:grid-cols-4 gap-2 bg-sand/40">
        <Field label="اسم الباقة"><input className={inp} value={p.name} maxLength={60} placeholder="شهري / 3 شهور / دائم" onChange={(e) => setArr('packages', i, { name: e.target.value })} /></Field>
        <Field label="السعر (ج.م)"><Num min={0} step="0.01" value={p.priceEgp} onChange={(v: number) => setArr('packages', i, { priceEgp: v })} /></Field>
        <Field label="السعر بالدولار (اختياري)"><Num min={0} step="0.01" value={p.priceUsd} onChange={(v: number) => setArr('packages', i, { priceUsd: v })} /></Field>
        <Field label="المدة بالأيام (فارغ = دائم)"><Num min={0} value={p.durationDays} onChange={(v: number) => setArr('packages', i, { durationDays: v })} /></Field>
        <Field label="شارة الخصم"><input className={inp} value={p.badge || ''} maxLength={30} placeholder="خصم 20%" onChange={(e) => setArr('packages', i, { badge: e.target.value })} /></Field>
        <div className="flex items-end"><Toggle label="مفعّلة" value={p.active} onChange={(v) => setArr('packages', i, { active: v })} /></div>
        <div className="flex items-end justify-end md:col-span-2 gap-2"><Btn kind="danger" onClick={() => up('packages', ed.packages.filter((_: any, j: number) => j !== i))}>حذف الباقة</Btn></div>
        {methods.length > 0 && <details className="md:col-span-4"><summary className="text-sm cursor-pointer">أسعار مخصصة لكل طريقة دفع (اختياري)</summary>
          <p className="text-xs text-gray-500 my-1">المبلغ بعملة الطريقة نفسها (جنيه لفودافون، كريديت للعملات) قبل الرسوم/الضريبة. اتركه فارغاً للتحويل التلقائي.</p>
          <div className="grid md:grid-cols-3 gap-2">{methods.map((m) => <Field key={m.id} label={m.name}><Num min={0} step="0.01" value={p.priceOverrides?.[m.id]} placeholder="تلقائي"
            onChange={(v: number) => { const o = { ...(p.priceOverrides || {}) }; if (v > 0) o[m.id] = v; else delete o[m.id]; setArr('packages', i, { priceOverrides: o }); }} /></Field>)}</div></details>}
      </div>)}</section>
    <section className="bg-white border rounded-lg p-4 space-y-3"><div className="flex justify-between"><h3 className="font-bold">أسئلة الطلب (حتى 5)</h3>{ed.questions.length < 5 && <Btn kind="ghost" onClick={() => up('questions', [...ed.questions, { label: '', type: 'short', required: true, options: [], sortOrder: ed.questions.length }])}>+ سؤال</Btn>}</div>
      {ed.questions.map((q: any, i: number) => <div key={i} className="border rounded p-3 grid md:grid-cols-3 gap-2 bg-sand/40">
        <Field label="نص السؤال (حتى 45 حرفاً)"><input className={inp} value={q.label} maxLength={45} onChange={(e) => setArr('questions', i, { label: e.target.value })} /></Field>
        <Field label="النوع"><select className={inp} value={q.type} onChange={(e) => setArr('questions', i, { type: e.target.value })}>{Object.entries(QT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <div className="flex items-end gap-3"><Toggle label="إجباري" value={q.required} onChange={(v) => setArr('questions', i, { required: v })} /><Btn kind="danger" onClick={() => up('questions', ed.questions.filter((_: any, j: number) => j !== i))}>حذف</Btn></div>
        {q.type === 'select' && <div className="md:col-span-3"><Field label="الخيارات (خيار في كل سطر)"><textarea className={inp} rows={3} value={q.options.join('\n')} onChange={(e) => setArr('questions', i, { options: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field></div>}
      </div>)}</section>
    {nt.view}
    <div className="flex gap-2"><Btn disabled={busy} onClick={save}>{busy ? '...' : 'حفظ المنتج'}</Btn><Btn kind="ghost" onClick={() => setEd(null)}>إلغاء</Btn></div>
  </div>;
  return <div className="space-y-3"><div className="flex justify-between items-center"><h2 className="text-lg font-bold">المنتجات ({list.length})</h2><Btn onClick={() => { nt.clear(); setEd(blank()); }}>+ منتج جديد</Btn></div>{nt.view}
    {!list.length && <p className="text-gray-500">لا توجد منتجات بعد.</p>}
    <div className="grid md:grid-cols-2 gap-3">{list.map((p) => <div key={p.id} className={`bg-white border rounded-lg p-3 space-y-2 ${p.active ? '' : 'opacity-60'}`}>
      <div className="flex justify-between"><b>{p.name}</b><span className="text-xs bg-sand rounded px-2 py-0.5">{p.category || 'بدون تصنيف'}</span></div>
      <p className="text-sm text-gray-600 line-clamp-2">{p.description || '—'}</p>
      <p className="text-xs">الباقات: {p.packages.length ? p.packages.map((k: any) => `${k.name} (${k.priceEgp} ج)`).join('، ') : '—'}</p>
      <p className="text-xs">المخزون: {p.stockMode === 'keys' ? `${p.keysAvailable} متاح / ${p.keysUsed} مستخدم` : p.stockMode === 'limited' ? p.stockCount : 'غير محدود'} · التسليم: {(DELIV as any)[p.deliveryType]}</p>
      <div className="flex gap-2 flex-wrap"><Btn kind="ghost" onClick={() => { nt.clear(); setEd({ ...p, image: p.image || '', category: p.category || '' }); }}>تعديل</Btn><Btn kind="ghost" onClick={() => toggle(p)}>{p.active ? 'تعطيل' : 'تفعيل'}</Btn><Btn kind="danger" onClick={() => del(p)}>حذف</Btn></div></div>)}</div></div>;
}
function KeysBox({ guildId, product, onChange }: { guildId: string; product: any; onChange: () => void }) {
  const url = `/api/guilds/${guildId}/store/keys`; const [text, setText] = useState(''); const [keys, setKeys] = useState<any[]>([]); const nt = useNotice(); const [open, setOpen] = useState(false);
  const load = () => api(`${url}?productId=${product.id}`).then((j) => setKeys(j.keys)).catch(nt.err); useEffect(() => { load(); }, []);
  async function add() { try { const r = await api(url, 'POST', { productId: product.id, text }); nt.ok(`أُضيف ${r.added} مفتاح، وتم تجاهل ${r.duplicates} مكرر`); setText(''); load(); onChange(); } catch (e) { nt.err(e); } }
  async function rm(id: string) { try { await api(`${url}?id=${id}`, 'DELETE'); load(); onChange(); } catch (e) { nt.err(e); } }
  return <div className="border rounded p-3 space-y-2 bg-sand/40"><h4 className="font-medium">مخزون المفاتيح: {keys.filter((k) => !k.used).length} متاح</h4>
    <Field label="إضافة مفاتيح بالجملة" hint="مفتاح في كل سطر (أو ملف CSV: العمود الأول). المكرر يُتجاهل تلقائياً."><textarea dir="ltr" className={inp} rows={5} value={text} onChange={(e) => setText(e.target.value)} /></Field>
    <input type="file" accept=".csv,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const nextText = await f.text(); setText((t) => (t ? t + '\n' : '') + nextText); }} />
    <div className="flex gap-2"><Btn disabled={!text.trim()} onClick={add}>إضافة المفاتيح</Btn><Btn kind="ghost" onClick={() => setOpen(!open)}>{open ? 'إخفاء' : 'عرض'} المفاتيح</Btn></div>{nt.view}
    {open && <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1" dir="ltr">{keys.map((k) => <div key={k.id} className="flex justify-between bg-white border rounded px-2 py-1"><span className={k.used ? 'line-through text-gray-400' : ''}>{k.value}</span>{!k.used && <button className="text-red-600" onClick={() => rm(k.id)}>حذف</button>}</div>)}</div>}</div>;
}
