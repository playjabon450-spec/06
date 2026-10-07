import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from './auth';
// Owner-only helpers. OWNER_IDS = comma-separated Discord user IDs (same variable as the bot).
export const ownerIds = () => (process.env.OWNER_IDS || process.env.BOT_OWNER_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
export const isOwner = (uid?: string | null) => !!uid && ownerIds().includes(uid);
export function ownerRoute<T extends z.ZodTypeAny>(schema: T | null, fn: (a: { uid: string; body: z.infer<T>; req: Request }) => Promise<any>) {
  return async (req: Request) => {
    const s: any = await getServerSession(authOptions); if (!s?.uid || !isOwner(s.uid)) return NextResponse.json({ error: 'للمالك فقط' }, { status: 403 });
    let body: any = null; if (schema) { const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || 'بيانات غير صالحة' }, { status: 400 }); body = p.data; }
    try { return NextResponse.json(await fn({ uid: s.uid, body, req })); } catch (e: any) { if (/[\u0600-\u06FF]/.test(String(e?.message))) return NextResponse.json({ error: e.message }, { status: 400 }); console.error(e); return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 }); }
  };
}
