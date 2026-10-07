import { prisma } from './prisma';
// Mirror of bot/modules/insights/lib/days.js (local-day keys) + bestTimes.
export async function tzOf(guildId: string) { const g: any = await prisma.guild.findUnique({ where: { id: guildId } }); return (g?.settings?.timezone as string) || 'Africa/Cairo'; }
export function localDay(ms: number, tz: string) { let f: Intl.DateTimeFormat; try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }); } return f.format(new Date(ms)); }
export const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const weekday = (day: string) => new Date(Date.parse(day + 'T00:00:00Z')).getUTCDay();
export function bestTimes(cells: { weekday: number; hour: number; count: number }[], top = 3) { const m = new Map<number, number>(); for (const c of cells) m.set(c.weekday * 24 + c.hour, (m.get(c.weekday * 24 + c.hour) || 0) + c.count);
  return [...m.entries()].map(([k, count]) => ({ weekday: Math.floor(k / 24), hour: k % 24, count })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count || a.weekday * 24 + a.hour - (b.weekday * 24 + b.hour)).slice(0, top); }
