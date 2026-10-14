'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch, type PageResponse, STATE_COLORS, STATE_LABELS } from '@/lib/admin-api';

type LedgerRow = Record<string, unknown> & { id: string };

function textValue(value: unknown, fallback = '—') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function dateValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? new Date(value).toLocaleString('so-SO')
    : '—';
}

export function AdminLedger({ kind }: { kind: 'reviews' | 'revisions' | 'audit-logs' }) {
  const router = useRouter();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const title =
    kind === 'reviews'
      ? 'Dib-u-eegis sugaya'
      : kind === 'revisions'
        ? 'Taariikhda noocyada'
        : 'Diiwaanka hawlaha';

  const load = useCallback(
    async (next = 0) => {
      setLoading(true);
      setError('');
      const result = await adminFetch<PageResponse<LedgerRow>>(`${kind}?limit=30&offset=${next}`);
      if (result.error === 'AUTH_REQUIRED') {
        router.replace('/admin/login');
        return;
      }
      if (result.error) setError(result.error);
      else if (result.data) {
        setRows(result.data.data);
        setOffset(result.data.offset);
        setTotal(result.data.total);
      }
      setLoading(false);
    },
    [kind, router],
  );
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminFrame>
      <div className="admin-content">
        <p className="admin-kicker">WORKFLOW</p>
        <h2>{title}</h2>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="admin-loading" role="status">
            Xogta ayaa la soo raraya…
          </p>
        ) : rows.length === 0 ? (
          <div className="admin-empty">Wax xog ah lama helin.</div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  {kind === 'reviews' ? (
                    <>
                      <th>Nooca</th>
                      <th>Cinwaan</th>
                      <th>Xaalad</th>
                      <th>La cusboonaysiiyay</th>
                      <th>Fur</th>
                    </>
                  ) : kind === 'revisions' ? (
                    <>
                      <th>Nooca</th>
                      <th>Aqoonsi</th>
                      <th>Nooca revision</th>
                      <th>Xaalad</th>
                      <th>Tifaftire</th>
                      <th>Waqti</th>
                    </>
                  ) : (
                    <>
                      <th>Hawl</th>
                      <th>Nooca</th>
                      <th>Aqoonsi</th>
                      <th>Sameeye</th>
                      <th>Waqti</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {kind === 'reviews' ? (
                      <>
                        <td>{textValue(row.contentType, '')}</td>
                        <td>
                          <strong>{textValue(row.title)}</strong>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${STATE_COLORS[row.state as keyof typeof STATE_COLORS]}`}
                          >
                            {STATE_LABELS[row.state as keyof typeof STATE_LABELS] ??
                              textValue(row.state, '')}
                          </span>
                        </td>
                        <td>{dateValue(row.updatedAt)}</td>
                        <td>
                          <a
                            href={
                              textValue(row.contentType) === 'CountryRevision'
                                ? `/admin/countries/${row.id}/edit`
                                : `/admin/${textValue(row.contentType) === 'HistoryArticle' ? 'articles' : textValue(row.contentType) === 'HistoricalPerson' ? 'figures' : textValue(row.contentType) === 'HistoricalEvent' ? 'events' : textValue(row.contentType) === 'HistoricalTimeline' ? 'timelines' : 'civilizations'}/${row.id}/edit`
                            }
                          >
                            Fur
                          </a>
                        </td>
                      </>
                    ) : kind === 'revisions' ? (
                      <>
                        <td>{textValue(row.contentType)}</td>
                        <td>{textValue(row.contentId)}</td>
                        <td>#{textValue(row.revisionNumber)}</td>
                        <td>{textValue(row.state)}</td>
                        <td>{textValue(row.editorSubject)}</td>
                        <td>{dateValue(row.createdAt)}</td>
                      </>
                    ) : (
                      <>
                        <td>{textValue(row.action)}</td>
                        <td>{textValue(row.targetType)}</td>
                        <td>{textValue(row.targetId)}</td>
                        <td>{textValue(row.actorSubject)}</td>
                        <td>{dateValue(row.createdAt)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 30 && (
          <div className="admin-pagination">
            <button
              disabled={!offset || loading}
              onClick={() => void load(Math.max(0, offset - 30))}
            >
              Kii hore
            </button>
            <span>
              {offset + 1}–{Math.min(offset + rows.length, total)} / {total}
            </span>
            <button
              disabled={offset + rows.length >= total || loading}
              onClick={() => void load(offset + 30)}
            >
              Kuwa xiga
            </button>
          </div>
        )}
      </div>
    </AdminFrame>
  );
}
