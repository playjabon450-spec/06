import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { userGuilds } from '@/lib/api';

function Brand() {
  return <span className="brand-lockup">
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
    <span className="brand-wordmark"><strong>مِتجر</strong><small>CONTROL PANEL</small></span>
  </span>;
}

export default async function Home() {
  const s: any = await getServerSession(authOptions);
  if (!s) return <main className="auth-page">
    <div className="auth-shell">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-main">
          <p className="auth-eyebrow"><span /> مساحة إدارة المتجر</p>
          <h1>لوحة تحكم<br />متجرك.</h1>
          <p className="auth-story-caption">مساحة عملك على Discord، بتصميم عربي واضح.</p>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="preview-chrome"><span className="preview-dots"><i /><i /><i /></span><span>مساحة العمل</span><span className="preview-live"><i /> نشط</span></div>
          <div className="preview-app">
            <aside className="preview-sidebar"><span className="preview-mini-mark" /><i className="selected" /><i /><i /><i /><i /></aside>
            <div className="preview-main">
              <div className="preview-toolbar"><i /><i /><b /></div>
              <div className="preview-heading"><span /><i /></div>
              <div className="preview-stats"><i /><i /><i /></div>
              <div className="preview-panels"><div className="preview-chart"><i /><i /><i /><i /><i /><i /><i /></div><div className="preview-rows"><i /><i /><i /><i /></div></div>
            </div>
          </div>
        </div>
        <p className="auth-story-foot">إدارة أبسط، وتركيز أكبر.</p>
      </section>
      <section className="auth-form-zone">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Brand /></div>
          <p className="auth-form-kicker">تسجيل دخول آمن</p>
          <h2>مرحبًا بك</h2>
          <p className="auth-form-copy">سجّل الدخول باستخدام حساب Discord للمتابعة.</p>
          <Link href="/api/auth/signin/discord" className="discord-button">
            <span>المتابعة باستخدام Discord</span><span className="discord-arrow" aria-hidden="true">←</span>
          </Link>
          <p className="auth-form-note"><span /> اتصال آمن عبر Discord</p>
        </div>
        <footer className="auth-form-footer">متجر <span>•</span> لوحة التحكم</footer>
      </section>
    </div>
  </main>;
  const gs = (await userGuilds(s.accessToken)).filter((g: any) => g.owner || (BigInt(g.permissions) & BigInt(0x28)) !== BigInt(0));
  return <main className="workspace-page">
    <div className="workspace-container">
      <header className="workspace-header"><Brand /><span className="workspace-status"><i /> متصل عبر Discord</span></header>
      <section className="workspace-intro">
        <div><p className="workspace-kicker">مساحة العمل</p><h1>اختر خادمًا</h1><p className="workspace-copy">الخوادم التي تملك صلاحية إدارتها تظهر هنا.</p></div>
        <div className="workspace-count"><strong>{gs.length.toString().padStart(2, '0')}</strong><span>خوادم متاحة</span></div>
      </section>
      {gs.length === 0 ? <div className="workspace-empty"><span className="empty-mark" aria-hidden="true"><i /><i /></span><h2>لا توجد خوادم متاحة</h2><p>تحقق من صلاحية إدارة الخادم في Discord ثم أعد المحاولة.</p></div> :
        <ul className="guild-grid">{gs.map((g: any) => <li key={g.id}><Link className="guild-card" href={`/${g.id}`}>
          <span className="guild-avatar">{g.name?.trim()?.charAt(0) || 'م'}</span><span className="guild-details"><strong>{g.name}</strong><small>فتح لوحة الخادم</small></span><span className="guild-arrow" aria-hidden="true">←</span>
        </Link></li>)}</ul>}
    </div>
  </main>;
}
