'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Dashboard = {
  counts: Record<string, number>;
  recentActivity: Array<{
    id: string;
    actorSubject: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
  }>;
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1').replace(
  /\/$/,
  '',
);
const cards = [
  ['countries', 'Dalal'],
  ['articles', 'Maqaallo'],
  ['events', 'Dhacdooyin'],
  ['figures', 'Shakhsiyaad taariikhi ah'],
  ['timelines', 'Jadwallo'],
  ['civilizations', 'Ilbaxnimooyin'],
  ['publishedContent', 'Xog la daabacay'],
  ['publishedArticles', 'Maqaallo la daabacay'],
  ['drafts', 'Qoraallo qabyo ah'],
  ['pendingReviews', 'Sugaya dib-u-eegis'],
] as const;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('wh_admin_access_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    void fetch(`${apiBase}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          sessionStorage.removeItem('wh_admin_access_token');
          router.replace('/admin/login');
          return;
        }
        if (response.status === 403)
          throw new Error('Koontadaadu ma laha oggolaanshaha dashboard-ka maamulka.');
        if (!response.ok)
          throw new Error('Xogta dashboard-ka lama heli karin. Hubi API-ga iyo dejintiisa.');
        setData((await response.json()) as Dashboard);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Xogta lama heli karin.'),
      );
  }, [router]);

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
        <a className="admin-nav-active" href="/admin">
          Dulmar guud
        </a>
        <p className="admin-side-label">XOGTA</p>
        <span>Dalal · Maqaallo · Dhacdooyin</span>
        <span>Shakhsiyaad · Jadwallo · Ilbaxnimooyin</span>
        <a href="/admin/sources">Ilo iyo tixraacyo</a>
        <a href="/admin/media">Warbaahin</a>
        <p className="admin-side-note">
          Xog-koobka, ilaha iyo metadata warbaahinta waa la xiriiriyey. Qaybaha kale weli waa la
          dhammaystirayaa.
        </p>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>WORLDHERITAGE / MAAMUL</span>
            <h1>Dashboard-ka maamulka</h1>
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
        <div className="admin-content">
          <p className="admin-kicker">KOOBKA XOGTA</p>
          <h2>Hawlaha tifaftirka</h2>
          <p className="admin-lead">
            Tirooyinkan toos ayay uga imanayaan xogta PostgreSQL ee API-ga.
          </p>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          {!data && !error && (
            <p className="admin-loading" role="status">
              Xogta dashboard-ka ayaa la soo raraya…
            </p>
          )}
          {data && (
            <>
              <div className="admin-stat-grid">
                {cards.map(([key, label]) => (
                  <article className="admin-stat-card" key={key}>
                    <span>{label}</span>
                    <strong>{data.counts[key] ?? 0}</strong>
                  </article>
                ))}
              </div>
              <section className="admin-activity">
                <div>
                  <p className="admin-kicker">DIIWAANKA HAWLAHA</p>
                  <h3>Hawlihii ugu dambeeyay</h3>
                </div>
                {data.recentActivity.length === 0 ? (
                  <p>Weli wax hawlo maamul ah laguma diiwaangelin.</p>
                ) : (
                  <ul>
                    {data.recentActivity.map((event) => (
                      <li key={event.id}>
                        <span>
                          <strong>{event.action}</strong> · {event.targetType}
                          {event.targetId ? ` · ${event.targetId}` : ''}
                          <small>{event.actorSubject ?? 'Isticmaale aan la aqoonsan'}</small>
                        </span>
                        <time dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString('so-SO')}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          <aside className="admin-notice">
            <strong>Xaaladda CMS</strong>
            <p>
              Dashboard-ku waa API ku xiran. Maamulka qoraallada, dib-u-eegista, iyo daabacaaddu
              waxay u baahan yihiin dhammaan API-yada wax-ka-beddelka iyo kaydinta noocyada xogta.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
