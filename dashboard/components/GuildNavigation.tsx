'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Manifest } from '@/lib/manifests';

export default function GuildNavigation({ guildId, items }: { guildId: string; items: Manifest[] }) {
  const pathname = usePathname();

  return <nav className="dashboard-nav" aria-label="أقسام لوحة الخادم">
    <p className="dashboard-nav-title">القائمة الرئيسية</p>
    <div className="dashboard-nav-list">
      {items.map((item, index) => {
        const href = `/${guildId}${item.href}`;
        const isActive = pathname === href || (item.href !== '' && pathname.startsWith(`${href}/`));

        return <Link key={item.id} href={href} className={`dashboard-nav-link${isActive ? ' is-active' : ''}`} aria-current={isActive ? 'page' : undefined}>
          <span className="dashboard-nav-number">{String(index + 1).padStart(2, '0')}</span>
          <span>{item.label}</span>
          <span className="dashboard-nav-arrow" aria-hidden="true">←</span>
        </Link>;
      })}
    </div>
  </nav>;
}