'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch, getToken } from '@/lib/admin-api';

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

const catalogCards = [
  { key: 'countries', label: 'Dalal', href: '/admin/countries' },
  { key: 'articles', label: 'Maqaallo', href: '/admin/articles' },
  { key: 'events', label: 'Dhacdooyin', href: '/admin/events' },
  { key: 'figures', label: 'Shakhsiyaad', href: '/admin/figures' },
  { key: 'timelines', label: 'Jadwallo', href: '/admin/timelines' },
  { key: 'civilizations', label: 'Ilbaxnimooyin', href: '/admin/civilizations' },
] as const;

const workflowCards = [
  { key: 'publishedContent', label: 'Xog la daabacay', href: '/admin/articles' },
  { key: 'publishedArticles', label: 'Maqaallo la daabacay', href: '/admin/articles' },
  { key: 'drafts', label: 'Qoraallo qabyo ah', href: '/admin/articles' },
  { key: 'pendingReviews', label: 'Sugaya dib-u-eegis', href: '/admin/reviews' },
] as const;

const shortcuts = [
  { href: '/admin/articles', label: 'Maqaallo', group: 'Qor oo maamul' },
  { href: '/admin/events', label: 'Dhacdooyin', group: 'Qor oo maamul' },
  { href: '/admin/reviews', label: 'Dib-u-eegis sugaya', group: 'Socodka shaqada' },
  { href: '/admin/sources', label: 'Ilo iyo tixraacyo', group: 'Aqoon-ururin' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/admin/login');
      return;
    }
    void adminFetch<Dashboard>('dashboard').then((result) => {
      if (result.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (result.status === 403) {
        setError('Koontadaadu ma laha oggolaanshaha dashboard-ka maamulka.');
        return;
      }
      if (result.error || !result.data) {
        setError('Xogta dashboard-ka lama heli karin. Hubi API-ga iyo dejintiisa.');
        return;
      }
      setData(result.data);
    });
  }, [router, refreshKey]);

  return (
    <AdminFrame title="Dashboard-ka maamulka" crumb="WorldHeritage / Maamul">
      <div className="admin-content">
        <div className="admin-dashboard-intro">
          <div>
            <p className="admin-kicker">Koobka xogta</p>
            <h2>Hawlaha tifaftirka</h2>
            <p className="admin-lead">
              Halkaan ka eeg xogta, xaaladda daabacaadda, iyo hawlihii ugu dambeeyay.
            </p>
          </div>
          <Link className="admin-primary-link" href="/admin/articles/new">+ Qoraal cusub</Link>
        </div>
        {error && (
          <div className="admin-error admin-error-row" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => { setError(''); setRefreshKey((key) => key + 1); }}>
              Mar kale isku day
            </button>
          </div>
        )}
        {!data && !error && (
          <p className="admin-loading" role="status">
            Xogta dashboard-ka ayaa la soo raraya…
          </p>
        )}

        <section className="admin-panel admin-shortcuts-panel" aria-labelledby="admin-shortcuts-heading">
          <div className="admin-panel-head">
            <p className="admin-kicker">Jidadka degdegga</p>
            <h3 id="admin-shortcuts-heading">Fur qaybaha maamulka</h3>
          </div>
          <div className="admin-quick-grid">
            {shortcuts.map((link) => (
              <Link className="admin-quick-card" href={link.href} key={link.href}>
                <small>{link.group}</small>
                <strong>{link.label}</strong>
              </Link>
            ))}
          </div>
        </section>

        {data && (
          <>
            <section className="admin-panel" aria-labelledby="admin-catalog-heading">
              <div className="admin-panel-head">
                <p className="admin-kicker">Xogta</p>
                <h3 id="admin-catalog-heading">Tirada diiwaannada</h3>
              </div>
              <div className="admin-stat-grid">
                {catalogCards.map((card) => (
                  <Link className="admin-stat-card" href={card.href} key={card.key}>
                    <span>{card.label}</span>
                    <strong>{data.counts[card.key] ?? 0}</strong>
                  </Link>
                ))}
              </div>
            </section>

            <section className="admin-panel" aria-labelledby="admin-workflow-heading">
              <div className="admin-panel-head">
                <p className="admin-kicker">Tifaftirka</p>
                <h3 id="admin-workflow-heading">Xaaladda daabacaadda</h3>
              </div>
              <div className="admin-stat-grid admin-stat-grid-4">
                {workflowCards.map((card) => (
                  <Link className="admin-stat-card" href={card.href} key={card.key}>
                    <span>{card.label}</span>
                    <strong>{data.counts[card.key] ?? 0}</strong>
                  </Link>
                ))}
              </div>
            </section>

            <div className="admin-dash-columns">
              <section className="admin-activity">
                <div>
                  <p className="admin-kicker">Diiwaanka hawlaha</p>
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
                <div className="admin-actions-row">
                  <Link className="admin-action-button" href="/admin/audit-logs">
                    Dhammaan diiwaanka
                  </Link>
                </div>
              </section>

              <div className="admin-dash-side">
                <section className="admin-activity">
                  <div>
                    <p className="admin-kicker">Cilmi-baarista Soomaaliya</p>
                    <h3>{data.counts.somaliResearchDrafts ?? 0} qoraal oo Draft ah</h3>
                    <p>Qoraalladani weli waxay sugayaan hubinta ilaha iyo dib-u-eegista taariikheed.</p>
                  </div>
                  <div className="admin-actions-row">
                    <Link className="admin-action-button" href="/admin/articles">
                      Maqaallada
                    </Link>
                    <Link className="admin-action-button" href="/admin/events">
                      Dhacdooyinka
                    </Link>
                    <Link className="admin-action-button" href="/admin/figures">
                      Shakhsiyaadka
                    </Link>
                    <Link className="admin-action-button" href="/research" target="_blank" rel="noreferrer">
                      Bogga dadweynaha
                    </Link>
                  </div>
                </section>
                <aside className="admin-notice">
                  <strong>Xaaladda CMS</strong>
                  <p>
                    Dashboard-ku waa API ku xiran. Maamulka qoraallada, dib-u-eegista, iyo
                    daabacaaddu waxay u baahan yihiin in API-ga uu shaqeeyo.
                  </p>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminFrame>
  );
}
