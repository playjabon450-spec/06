import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManage } from '@/lib/api';
import { getManifests } from '@/lib/manifests';
export default async function GuildLayout({ children, params }: { children: React.ReactNode; params: { guildId: string } }) {
  const s: any = await getServerSession(authOptions);
  if (!s || !(await canManage(s, params.guildId))) redirect('/');
  const items = await getManifests();
  return <div className="min-h-screen md:flex">
    <nav className="md:w-56 bg-ink text-white p-4 flex md:block gap-2 overflow-x-auto">
      {items.map((m) => <Link key={m.id} href={`/${params.guildId}${m.href}`} className="block px-3 py-2 rounded hover:bg-white/10 whitespace-nowrap">{m.label}</Link>)}
    </nav><main className="flex-1 p-6">{children}</main></div>;
}
