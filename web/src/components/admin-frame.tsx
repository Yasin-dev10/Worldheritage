'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const adminNavSections = [
  {
    label: 'Maamulka',
    links: [{ href: '/admin', label: 'Dulmar guud' }],
  },
  {
    label: 'Xogta',
    links: [
      { href: '/admin/countries', label: 'Dalal' },
      { href: '/admin/articles', label: 'Maqaallo' },
      { href: '/admin/events', label: 'Dhacdooyin' },
      { href: '/admin/figures', label: 'Shakhsiyaad' },
      { href: '/admin/timelines', label: 'Jadwallo' },
      { href: '/admin/civilizations', label: 'Ilbaxnimooyin' },
      { href: '/admin/periods', label: 'Xilliyada taariikhda' },
      { href: '/admin/museum', label: 'Matxaf iyo khariidado' },
    ],
  },
  {
    label: 'Aqoon-ururinta',
    links: [
      { href: '/admin/sources', label: 'Ilo iyo tixraacyo' },
      { href: '/admin/media', label: 'Warbaahin' },
    ],
  },
  {
    label: 'Hawlaha',
    links: [
      { href: '/admin/reviews', label: 'Dib-u-eegis sugaya' },
      { href: '/admin/revisions', label: 'Taariikhda noocyada' },
      { href: '/admin/audit-logs', label: 'Diiwaanka hawlaha' },
    ],
  },
];

export function AdminFrame({
  children,
  title = 'Maamulka xogta',
  crumb = 'WorldHeritage / Maamul',
}: {
  children: ReactNode;
  title?: string;
  crumb?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    sessionStorage.removeItem('wh_admin_access_token');
    router.replace('/admin/login');
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <Link className="admin-brand" href="/admin">
            <span>W</span>
            <strong>WorldHeritage</strong>
          </Link>
          <p className="admin-brand-sub">CMS-ka xogta taariikhda</p>
        </div>
        <nav className="admin-nav" aria-label="Hagidda maamulka">
          {adminNavSections.map((section) => (
            <div className="admin-nav-section" key={section.label}>
              <p className="admin-side-label">{section.label}</p>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive(link.href) ? 'admin-nav-link admin-nav-active' : 'admin-nav-link'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-side-note">
          <span className="admin-side-status" aria-hidden="true" />
          <p>Goobta maamulka</p>
          <small>Qor, dib u eeg, oo maamul xogta dhaxalka.</small>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>{crumb}</span>
            <h1>{title}</h1>
          </div>
          <nav className="admin-mobile-nav" aria-label="Hagidda maamulka">
            {adminNavSections.map((section) => (
              <div className="admin-mobile-nav-group" key={section.label}>
                <strong>{section.label}</strong>
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? 'page' : undefined}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <button className="admin-quiet-button" type="button" onClick={logout}>
            Ka bax
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}
