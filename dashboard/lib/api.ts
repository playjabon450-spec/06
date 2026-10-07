import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { bot } from './discord';
import { limited } from './ratelimit';
const MANAGE_GUILD = BigInt(0x20), ADMIN = BigInt(0x8);
const cache = new Map<string, { at: number; guilds: any[] }>();
export async function userGuilds(token: string) {
  const c = cache.get(token); if (c && Date.now() - c.at < 60000) return c.guilds;
  const r = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return c?.guilds || [];
  const guilds = await r.json(); cache.set(token, { at: Date.now(), guilds }); return guilds;
}
export async function canManage(session: any, guildId: string) {
  if (!session?.accessToken) return false;
  const g = (await userGuilds(session.accessToken)).find((x: any) => x.id === guildId);
  if (g && (g.owner || (BigInt(g.permissions) & (MANAGE_GUILD | ADMIN)) !== BigInt(0))) return true;
  // Dashboard-access roles (settings.dashboardRoleIds): checked through the bot token.
  try {
    const row: any = await prisma.guild.findUnique({ where: { id: guildId } });
    const ids: string[] = row?.settings?.dashboardRoleIds || []; if (!ids.length || !session.uid) return false;
    const m = await bot(`/guilds/${guildId}/members/${session.uid}`);
    return m.roles.some((r: string) => ids.includes(r));
  } catch { return false; }
}
export const bumpConfig = (guildId: string) => prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId, configVersion: 1 }, update: { configVersion: { increment: 1 } } });
export const audit = (guildId: string, userId: string, action: string, details: any = {}) => prisma.auditLog.create({ data: { guildId, userId, action, details } });
export const enqueueJob = (guildId: string, type: string, payload: any) => prisma.botJob.create({ data: { guildId, type, payload } });
// Wrapper: session + Manage Server check, zod validation, friendly errors.
export function guildRoute<T extends z.ZodTypeAny>(schema: T | null, fn: (a: { guildId: string; uid: string; body: z.infer<T>; req: Request; params: any }) => Promise<any>) {
  return async (req: Request, { params }: { params: { guildId: string } }) => {
    try {
      const session: any = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
      if (limited(`${session.uid}:${req.method}`, req.method === 'GET' ? 120 : 40)) return NextResponse.json({ error: 'طلبات كثيرة، حاول بعد قليل' }, { status: 429 });
      if (!(await canManage(session, params.guildId))) return NextResponse.json({ error: 'ليست لديك صلاحية إدارة هذا السيرفر' }, { status: 403 });
      let body: any = undefined;
      if (schema) { const p = schema.safeParse(await req.json().catch(() => ({}))); if (!p.success) { const m = p.error.issues.find((i) => /[\u0600-\u06FF]/.test(i.message))?.message; return NextResponse.json({ error: m || 'بيانات غير صالحة، راجع الحقول' }, { status: 400 }); } body = p.data; }
      return NextResponse.json(await fn({ guildId: params.guildId, uid: session.uid, body, req, params }));
    } catch (e: any) { if (/[\u0600-\u06FF]/.test(String(e?.message))) return NextResponse.json({ error: e.message }, { status: 400 }); /* Arabic message = intentional user-facing error */ console.error(e); return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 }); }
  };
}
