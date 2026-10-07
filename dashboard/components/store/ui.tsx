'use client';
import { useState } from 'react';
export async function api(url: string, method = 'GET', body?: any) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'حدث خطأ'); return j;
}
export const inp = 'w-full border rounded p-2 bg-white';
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block text-xs text-gray-500">{hint}</span>}</label>;
}
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><span className="text-sm">{label}</span></label>;
}
export function Num({ value, onChange, ...p }: { value: number | null | undefined; onChange: (v: number) => void } & any) {
  return <input type="number" className={inp} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} {...p} />;
}
export const Btn = ({ kind = 'primary', ...p }: any) => <button type="button" {...p} className={`px-3 py-1.5 rounded text-sm disabled:opacity-50 ${kind === 'danger' ? 'bg-red-600 text-white' : kind === 'ghost' ? 'border bg-white' : 'bg-sea text-white'} ${p.className || ''}`} />;
export function useNotice() {
  const [n, set] = useState<{ ok: boolean; text: string } | null>(null);
  return { n, ok: (text: string) => set({ ok: true, text }), err: (e: any) => set({ ok: false, text: e?.message || String(e) }), clear: () => set(null),
    view: n && <p className={`text-sm rounded p-2 ${n.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{n.text}</p> };
}
