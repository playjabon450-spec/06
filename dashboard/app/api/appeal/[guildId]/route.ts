import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bot } from '@/lib/discord';
import { enqueueJob } from '@/lib/api';
import { appealSchema } from '@/lib/shieldSchemas';
// PUBLIC appeal endpoint: any Discord-logged-in user, but only a user who is actually banned in that guild can submit.
const hits = new Map<string, number[]>(); const WEEK = 7 * 86400000;
const limited = (k: string) => { const now = Date.now(); const a = (hits.get(k) || []).filter((t) => now - t < 60000); a.push(now); hits.set(k, a); return a.length > 6; };
async function ctx(req: Request, guildId: string) {
  const s: any = await getServerSession(authOptions); if (!s?.uid) return { err: NextResponse.json({ error: 'سجّل الدخول بحساب ديسكورد أولاً' }, { status: 401 }) };
  if (!/^\d{5,25}$/.test(guildId)) return { err: NextResponse.json({ error: 'سيرفر غير صالح' }, { status: 400 }) }; if (limited(s.uid)) return { err: NextResponse.json({ error: 'محاولات كثيرة، انتظر دقيقة' }, { status: 429 }) };
  const g: any = await prisma.guild.findUnique({ where: { id: guildId } }); const ap = g?.settings?.shield?.appeals; if (!g || !ap?.enabled) return { err: NextResponse.json({ error: 'الاستئناف غير متاح في هذا السيرفر' }, { status: 404 }) };
  return { uid: s.uid as string, name: (s.user?.name as string) || '', intro: (ap.intro as string) || '' };
}
const isBanned = (guildId: string, uid: string) => bot(`/guilds/${guildId}/bans/${uid}`).then(() => true).catch(() => false);
export async function GET(req: Request, { params }: { params: { guildId: string } }) {
  const c: any = await ctx(req, params.guildId); if (c.err) return c.err; const last = await prisma.banAppeal.findFirst({ where: { guildId: params.guildId, userId: c.uid }, orderBy: { createdAt: 'desc' } });
  const guild = await bot(`/guilds/${params.guildId}`).catch(() => null);
  return NextResponse.json({ guildName: guild?.name || '', intro: c.intro, banned: await isBanned(params.guildId, c.uid), last: last ? { status: last.status, createdAt: last.createdAt, reason: last.status === 'rejected' ? last.reviewReason : null, nextAt: new Date(+last.createdAt + WEEK) } : null });
}
export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  const c: any = await ctx(req, params.guildId); if (c.err) return c.err; const p = appealSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || 'بيانات غير صالحة' }, { status: 400 });
  if (!(await isBanned(params.guildId, c.uid))) return NextResponse.json({ error: 'حسابك غير محظور في هذا السيرفر' }, { status: 403 });
  const recent = await prisma.banAppeal.findFirst({ where: { guildId: params.guildId, userId: c.uid, createdAt: { gte: new Date(Date.now() - WEEK) } } }); if (recent) return NextResponse.json({ error: 'يمكنك تقديم استئناف واحد كل 7 أيام' }, { status: 429 });
  const a = await prisma.banAppeal.create({ data: { guildId: params.guildId, userId: c.uid, username: c.name.slice(0, 80), answers: p.data } }); await enqueueJob(params.guildId, 'shield:newAppeal', { appealId: a.id }); return NextResponse.json({ ok: true });
}
