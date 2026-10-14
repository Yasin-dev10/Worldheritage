'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import {
  adminFetch,
  type AdminArticle,
  type EditorialState,
  type PageResponse,
  STATE_LABELS,
  STATE_COLORS,
} from '@/lib/admin-api';

const STATE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Dhammaan' },
  { value: 'DRAFT', label: 'Qabyo' },
  { value: 'SUBMITTED', label: 'La gudbiyay' },
  { value: 'IN_REVIEW', label: 'Dib-u-eegis' },
  { value: 'APPROVED', label: 'La ansixiyay' },
  { value: 'PUBLISHED', label: 'La daabacay' },
  { value: 'ARCHIVED', label: 'La kaydiyay' },
];

export default function AdminArticlesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextOffset: number, search: string, state: string) => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '30', offset: String(nextOffset) });
      if (search.trim()) params.set('q', search.trim());
      if (state) params.set('state', state);
      const result = await adminFetch<PageResponse<AdminArticle>>(`articles?${params}`);
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
    void load(0, '', '');
  }, [load]);

  return (
    <AdminFrame>
      <div className="admin-content">
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>Maqaallada</h2>
        <div className="admin-actions-row">
          <form
            className="admin-inline-search"
            onSubmit={(e) => {
              e.preventDefault();
              void load(0, query, stateFilter);
            }}
          >
            <input
              aria-label="Raadi maqaallo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Raadi cinwaan…"
            />
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                void load(0, query, e.target.value);
              }}
              aria-label="Xaaladda"
            >
              {STATE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button>Raadi</button>
          </form>
          <a className="admin-action-button admin-publish-button" href="/admin/articles/new">
            + Maqaal cusub
          </a>
        </div>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="admin-loading" role="status">
            Maqaallada ayaa la soo raraya…
          </p>
        ) : rows.length === 0 ? (
          <div className="admin-empty">Weli maqaallo ma jiro.</div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cinwaanka</th>
                  <th>Slug</th>
                  <th>Qoraaga</th>
                  <th>Xaaladda</th>
                  <th>La daabacay</th>
                  <th>Hawlaha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.title ?? '—'}</strong>
                    </td>
                    <td>{row.slug}</td>
                    <td>{row.authorName}</td>
                    <td>
                      <span className={`admin-badge ${STATE_COLORS[row.state as EditorialState]}`}>
                        {STATE_LABELS[row.state as EditorialState] ?? row.state}
                      </span>
                    </td>
                    <td>
                      {row.publishedAt
                        ? new Date(row.publishedAt).toLocaleDateString('so-SO')
                        : '—'}
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <a href={`/admin/articles/${row.id}/edit`}>Wax ka beddel</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 30 && (
          <div className="admin-pagination">
            <button
              disabled={offset === 0 || loading}
              onClick={() => void load(Math.max(0, offset - 30), query, stateFilter)}
            >
              Kii hore
            </button>
            <span>
              {offset + 1}–{Math.min(offset + rows.length, total)} / {total}
            </span>
            <button
              disabled={offset + rows.length >= total || loading}
              onClick={() => void load(offset + 30, query, stateFilter)}
            >
              Kuwa xiga
            </button>
          </div>
        )}
      </div>
    </AdminFrame>
  );
}
