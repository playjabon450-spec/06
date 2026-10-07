import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isOwner } from '@/lib/owner';
import AdminPanel from '@/components/admin/AdminPanel';
// Owner-only (OWNER_IDS env). Everyone else is bounced.
export default async function Page() {
  const s: any = await getServerSession(authOptions); if (!s?.uid) redirect('/api/auth/signin?callbackUrl=/admin'); if (!isOwner(s.uid)) redirect('/');
  return <main dir="rtl" className="min-h-screen p-6 max-w-6xl mx-auto"><h1 className="text-2xl font-bold mb-4">لوحة المالك</h1><AdminPanel /></main>;
}
