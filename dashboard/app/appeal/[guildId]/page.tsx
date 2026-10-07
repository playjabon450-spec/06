import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppealForm from '@/components/shield/AppealForm';
// Public page: requires a Discord login (no manager rights needed).
export default async function Page({ params }: { params: { guildId: string } }) {
  const s: any = await getServerSession(authOptions);
  if (!s?.uid) return <main dir="rtl" className="min-h-screen flex items-center justify-center p-6"><div className="bg-white border rounded-lg p-6 text-center space-y-3 max-w-sm"><h1 className="text-lg font-bold">استئناف الحظر</h1><p className="text-sm text-gray-600">سجّل الدخول بحساب ديسكورد المحظور لتقديم استئناف.</p>
    <a className="inline-block bg-sea text-white rounded px-4 py-2" href={`/api/auth/signin?callbackUrl=${encodeURIComponent('/appeal/' + params.guildId)}`}>تسجيل الدخول عبر ديسكورد</a></div></main>;
  return <main dir="rtl" className="min-h-screen p-6"><AppealForm guildId={params.guildId} /></main>;
}
