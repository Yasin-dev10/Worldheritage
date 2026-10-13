'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export function AdminFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  function logout() {
    sessionStorage.removeItem('wh_admin_access_token');
    router.replace('/admin/login');
  }
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin">
          <span>W</span> WORLDHERITAGE
        </a>
        <p className="admin-side-label">MAAMULKA</p>
        <a href="/admin">Dulmar guud</a>
        <p className="admin-side-label">XOGTA</p>
        <a href="/admin/sources">Ilo iyo tixraacyo</a>
        <a href="/admin/media">Warbaahin</a>
        <p className="admin-side-note">Qaybaha kale ee maamulka weli waa la dhammaystirayaa.</p>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>WORLDHERITAGE / MAAMUL</span>
            <h1>Maamulka xogta</h1>
          </div>
          <nav className="admin-mobile-nav" aria-label="Hagidda maamulka">
            <a href="/admin">Dulmar</a>
            <a href="/admin/sources">Ilo</a>
            <a href="/admin/media">Warbaahin</a>
          </nav>
          <button className="admin-quiet-button" onClick={logout}>
            Ka bax
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}
