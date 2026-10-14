'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch, type PageResponse, type EditorialState } from '@/lib/admin-api';

type Kind = 'items' | 'maps' | 'exhibitions';
type RecordRow = {
  id: string;
  slug: string;
  state: EditorialState;
  translations?: Array<{ title?: string }>;
};
const config: Record<Kind, { title: string; fields: string[] }> = {
  items: {
    title: 'Agabka madxafka',
    fields: [
      'slug',
      'title',
      'description',
      'dateDisplay',
      'currentLocation',
      'creatorAttribution',
      'provenance',
      'rightsNotes',
      'mediaAssetId',
      'sources',
    ],
  },
  maps: {
    title: 'Khariidado taariikhi ah',
    fields: [
      'slug',
      'title',
      'description',
      'dateDisplay',
      'geographicArea',
      'startYear',
      'endYear',
      'provenance',
      'rightsNotes',
      'mediaAssetId',
      'sources',
    ],
  },
  exhibitions: {
    title: 'Bandhigyada',
    fields: ['slug', 'title', 'description', 'topic', 'itemIds'],
  },
};

export default function Page() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('items');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    locale: 'so',
    datePrecision: 'UNKNOWN',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    const result = await adminFetch<PageResponse<RecordRow>>(`museum/${kind}?limit=50&offset=0`);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) setError(result.error);
    else setRows(result.data?.data ?? []);
    setBusy(false);
  }, [kind, router]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body: Record<string, unknown> = { locale: 'so' };
    for (const [key, value] of Object.entries(values)) {
      if (key === 'sources' || key === 'itemIds') {
        try {
          body[key] = JSON.parse(value);
        } catch {
          setError(`${key} waa inuu noqdaa JSON sax ah.`);
          setBusy(false);
          return;
        }
      } else if (['startYear', 'endYear'].includes(key)) body[key] = value ? Number(value) : null;
      else body[key] = value || null;
    }
    const result = await adminFetch(`museum/${kind}${editing ? `/${editing.id}` : ''}`, {
      method: editing ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setValues({ locale: 'so', datePrecision: 'UNKNOWN' });
    await load();
  }

  async function edit(row: RecordRow) {
    setBusy(true);
    setError('');
    const result = await adminFetch<Record<string, unknown>>(`museum/${kind}/${row.id}`);
    setBusy(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error || !result.data) {
      setError(result.error ?? 'Diiwaanka lama helin.');
      return;
    }
    const data = result.data;
    const translation =
      (data.translations as Array<Record<string, unknown>> | undefined)?.find(
        (entry) => entry.locale === 'so',
      ) ?? {};
    const sources = Array.isArray(data.sources)
      ? data.sources.map((entry) => {
          const source = entry as Record<string, unknown>;
          return {
            sourceId: source.sourceId,
            claimNote: source.claimNote,
            claimStanding: source.claimStanding,
            ...('locator' in source ? { locator: source.locator } : {}),
          };
        })
      : [];
    const exhibitionItems = Array.isArray(data.itemIds) ? data.itemIds : [];
    const next: Record<string, string> = {
      locale: 'so',
      datePrecision: typeof data.datePrecision === 'string' ? data.datePrecision : 'UNKNOWN',
      sources: JSON.stringify(sources, null, 2),
      itemIds: JSON.stringify(exhibitionItems),
    };
    for (const field of config[kind].fields) {
      const value =
        field === 'title'
          ? translation.title
          : field === 'description'
            ? (translation.description ?? translation.summary)
            : field === 'sources'
              ? next.sources
              : field === 'itemIds'
                ? next.itemIds
                : data[field];
      next[field] = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    }
    setEditing(row);
    setValues(next);
  }

  async function archive(row: RecordRow) {
    if (!window.confirm('Diiwaankan ma la archive-gareeyaa?')) return;
    setBusy(true);
    setError('');
    const result = await adminFetch(`museum/${kind}/${row.id}`, { method: 'DELETE' });
    setBusy(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) setError(result.error);
    else {
      if (editing?.id === row.id) {
        setEditing(null);
        setValues({ locale: 'so', datePrecision: 'UNKNOWN' });
      }
      await load();
    }
  }

  async function transition(row: RecordRow, action: string) {
    setBusy(true);
    setError('');
    const result = await adminFetch(`museum/${kind}/${row.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) setError(result.error);
    else await load();
  }

  return (
    <AdminFrame>
      <div className="admin-content">
        <p className="admin-kicker">PHASE 6 · DIGITAL MUSEUM</p>
        <h2>Matxaf iyo khariidado</h2>
        <label className="admin-field-full">
          Qaybta
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as Kind);
              setValues({ locale: 'so', datePrecision: 'UNKNOWN' });
            }}
          >
            <option value="items">Agabka madxafka</option>
            <option value="exhibitions">Bandhigyada</option>
            <option value="maps">Khariidadaha taariikhiga ah</option>
          </select>
        </label>
        <form onSubmit={(event) => void create(event)}>
          <div className="admin-form-section">
            <h3>{editing ? `Wax ka beddel · ${editing.slug}` : 'Diiwaan cusub · draft'}</h3>
            <div className="admin-field-row">
              {config[kind].fields.map((field) => (
                <label className="admin-field-full" key={field}>
                  {field}
                  {['description', 'provenance', 'rightsNotes', 'sources', 'itemIds'].includes(
                    field,
                  ) ? (
                    <textarea
                      required={['sources'].includes(field)}
                      rows={field === 'description' ? 5 : 3}
                      placeholder={
                        field === 'sources'
                          ? '[{"sourceId":"UUID","claimNote":"...","claimStanding":"WELL_SUPPORTED"}]'
                          : field === 'itemIds'
                            ? '["item-uuid"]'
                            : ''
                      }
                      value={values[field] ?? ''}
                      onChange={(event) =>
                        setValues((old) => ({ ...old, [field]: event.target.value }))
                      }
                    />
                  ) : (
                    <input
                      required={['slug', 'title'].includes(field)}
                      type={['startYear', 'endYear'].includes(field) ? 'number' : 'text'}
                      value={values[field] ?? ''}
                      onChange={(event) =>
                        setValues((old) => ({ ...old, [field]: event.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <label className="admin-field-full">
              Saxnaanta taariikhda
              <select
                value={values.datePrecision ?? 'UNKNOWN'}
                onChange={(event) =>
                  setValues((old) => ({ ...old, datePrecision: event.target.value }))
                }
              >
                {['UNKNOWN', 'YEAR', 'RANGE', 'CIRCA', 'DECADE', 'CENTURY'].map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            </label>
            <button className="admin-primary-button" disabled={busy}>
              {editing ? 'Kaydi wax-ka-beddelka' : 'Kaydi draft'}
            </button>
            {editing ? (
              <button
                type="button"
                className="admin-action-button"
                onClick={() => {
                  setEditing(null);
                  setValues({ locale: 'so', datePrecision: 'UNKNOWN' });
                }}
              >
                Jooji wax-ka-beddelka
              </button>
            ) : null}
          </div>
        </form>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <h3>{config[kind].title}</h3>
        {busy ? (
          <p role="status">Waa la raraya…</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cinwaan</th>
                  <th>Slug</th>
                  <th>Xaalad</th>
                  <th>Maamulka</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.translations?.[0]?.title ?? '—'}</td>
                    <td>{row.slug}</td>
                    <td>{row.state}</td>
                    <td>
                      <div className="admin-table-actions">
                        {row.state === 'DRAFT' || row.state === 'CHANGES_REQUESTED' ? (
                          <>
                            <button onClick={() => void edit(row)}>Wax ka beddel</button>
                            <button onClick={() => void transition(row, 'submit')}>Gudbi</button>
                          </>
                        ) : null}
                        {row.state === 'SUBMITTED' ? (
                          <button onClick={() => void transition(row, 'review')}>Dib u eeg</button>
                        ) : null}
                        {row.state === 'IN_REVIEW' ? (
                          <button onClick={() => void transition(row, 'approve')}>Ansixi</button>
                        ) : null}
                        {row.state === 'APPROVED' ? (
                          <button onClick={() => void transition(row, 'publish')}>Daabac</button>
                        ) : null}
                        {row.state !== 'ARCHIVED' ? (
                          <button onClick={() => void archive(row)}>Archive</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminFrame>
  );
}
