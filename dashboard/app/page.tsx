import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { userGuilds } from '@/lib/api';
export default async function Home() {
  const s: any = await getServerSession(authOptions);
  if (!s) return <main className="min-h-screen grid place-items-center"><Link href="/api/auth/signin/discord" className="bg-sea text-white px-6 py-3 rounded-lg">تسجيل الدخول عبر ديسكورد</Link></main>;
  const gs = (await userGuilds(s.accessToken)).filter((g: any) => g.owner || (BigInt(g.permissions) & BigInt(0x28)) !== BigInt(0));
  return <main className="max-w-xl mx-auto p-8"><h1 className="text-2xl font-bold mb-6">اختر السيرفر</h1>
    {gs.length === 0 && <p>لا توجد سيرفرات تملك فيها صلاحية الإدارة.</p>}
    <ul className="space-y-2">{gs.map((g: any) => <li key={g.id}><Link className="block bg-white rounded-lg p-4 border hover:border-sea" href={`/${g.id}`}>{g.name}</Link></li>)}</ul></main>;
}
