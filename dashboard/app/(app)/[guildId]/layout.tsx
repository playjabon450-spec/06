import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManage } from '@/lib/api';
import { getManifests } from '@/lib/manifests';
import GuildNavigation from '@/components/GuildNavigation';
export default async function GuildLayout({ children, params }: { children: React.ReactNode; params: { guildId: string } }) {
  const s: any = await getServerSession(authOptions);
  if (!s || !(await canManage(s, params.guildId))) redirect('/');
  const items = await getManifests();
  return <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <Link href="/" className="dashboard-brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-wordmark"><strong>مِتجر</strong><small>CONTROL PANEL</small></span>
      </Link>
      <div className="dashboard-server-card"><span className="dashboard-server-icon">S</span><span><small>مساحة العمل</small><strong>إدارة الخادم</strong></span></div>
      <GuildNavigation guildId={params.guildId} items={items} />
      <div className="dashboard-sidebar-footer"><span className="dashboard-connection"><i /> متصل عبر Discord</span><Link href="/">تغيير الخادم <b aria-hidden="true">←</b></Link></div>
    </aside>
    <div className="dashboard-workspace">
      <header className="dashboard-topbar"><span><b>لوحة الإدارة</b><i>/</i> إعدادات الخادم</span><Link href="/">الخوادم <b aria-hidden="true">↗</b></Link></header>
      <main className="dashboard-main"><div className="dashboard-content">{children}</div></main>
      <footer className="dashboard-footer"><span>مِتجر <i>•</i> لوحة إدارة Discord</span><span>إدارة خادمك من مكان واحد</span></footer>
    </div>
  </div>;
}
