'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import {
  adminFetch,
  type AdminCountry,
  type PageResponse,
  STATE_LABELS,
  STATE_COLORS,
} from '@/lib/admin-api';

export default function AdminCountriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminCountry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextOffset: number, search: string) => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        limit: '30',
        offset: String(nextOffset),
      });
      if (search.trim()) params.set('q', search.trim());
      const result = await adminFetch<PageResponse<AdminCountry>>(`countries?${params}`);
      if (result.error === 'AUTH_REQUIRED') {
        router.replace('/admin/login');
        return;
      }
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setRows(result.data.data);
        setTotal(result.data.total);
        setOffset(result.data.offset);
      }
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    void load(0, '');
  }, [load]);

  return (
    <AdminFrame>
      <div className="admin-content">
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>Dalalka</h2>
        <div className="admin-actions-row">
          <form
            className="admin-inline-search"
            onSubmit={(e) => {
              e.preventDefault();
              void load(0, query);
            }}
          >
            <input
              aria-label="Raadi dalal"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Raadi magac ama slug…"
            />
            <button>Raadi</button>
          </form>
          <a className="admin-action-button admin-publish-button" href="/admin/countries/new">
            + Dar dal cusub
          </a>
        </div>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="admin-loading" role="status">
            Liiska dalada ayaa la soo raraya…
          </p>
        ) : rows.length === 0 ? (
          <div className="admin-empty">Weli xog dalal ah ma jiro.</div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Magac (so)</th>
                  <th>Slug</th>
                  <th>Region</th>
                  <th>ISO</th>
                  <th>Xaaladda</th>
                  <th>Hawlaha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const state = row.latestRevision?.state;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.latestRevision?.title ?? '—'}</strong>
                      </td>
                      <td>{row.slug}</td>
                      <td>{row.region ?? '—'}</td>
                      <td>{row.isoAlpha2 ?? '—'}</td>
                      <td>
                        {state ? (
                          <span className={`admin-badge ${STATE_COLORS[state]}`}>
                            {STATE_LABELS[state]}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <a href={`/admin/countries/${row.id}/edit`}>Wax ka beddel</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {total > 30 && (
          <div className="admin-pagination">
            <button
              disabled={offset === 0 || loading}
              onClick={() => void load(Math.max(0, offset - 30), query)}
            >
              Kii hore
            </button>
            <span>
              {offset + 1}–{Math.min(offset + rows.length, total)} / {total}
            </span>
            <button
              disabled={offset + rows.length >= total || loading}
              onClick={() => void load(offset + 30, query)}
            >
              Kuwa xiga
            </button>
          </div>
        )}
      </div>
    </AdminFrame>
  );
}
