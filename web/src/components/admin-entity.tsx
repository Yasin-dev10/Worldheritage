'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import {
  adminFetch,
  type EditorialState,
  type PageResponse,
  STATE_COLORS,
  STATE_LABELS,
} from '@/lib/admin-api';

type Field = {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  numeric?: boolean;
};
type EntityConfig = {
  title: string;
  endpoint: string;
  fields: Field[];
  create: string[];
  update: string[];
};

const entities: Record<string, EntityConfig> = {
  periods: {
    title: 'Xilliyada taariikhda',
    endpoint: 'periods',
    fields: [
      { name: 'slug', label: 'Slug', required: true },
      { name: 'title', label: 'Cinwaan', required: true },
      { name: 'summary', label: 'Soo koobid', required: true, multiline: true },
      { name: 'body', label: 'Qoraal', required: true, multiline: true },
      { name: 'dateDisplay', label: 'Muddada la muujinayo' },
      { name: 'startYear', label: 'Sannadka bilowga', numeric: true },
      { name: 'endYear', label: 'Sannadka dhammaadka', numeric: true },
      { name: 'datePrecision', label: 'Saxnaanta taariikhda' },
      { name: 'dateCertainty', label: 'Hubanti' },
      {
        name: 'sources',
        label: 'Ilaha (JSON: sourceId, claimNote, claimStanding)',
        multiline: true,
        required: true,
      },
      { name: 'eventIds', label: 'Dhacdooyinka (JSON UUID array)', multiline: true },
    ],
    create: [
      'slug',
      'title',
      'summary',
      'body',
      'dateDisplay',
      'startYear',
      'endYear',
      'datePrecision',
      'dateCertainty',
      'sources',
      'eventIds',
    ],
    update: [
      'title',
      'summary',
      'body',
      'dateDisplay',
      'startYear',
      'endYear',
      'datePrecision',
      'dateCertainty',
    ],
  },
  events: {
    title: 'Dhacdooyin',
    endpoint: 'events',
    fields: [
      { name: 'slug', label: 'Slug', required: true },
      { name: 'category', label: 'Qaybta', required: true },
      { name: 'title', label: 'Cinwaan (so)', required: true },
      { name: 'summary', label: 'Soo koobid', required: true, multiline: true },
      { name: 'body', label: 'Qoraal', required: true, multiline: true },
      { name: 'dateDisplay', label: 'Taariikhda muuqata' },
      { name: 'startYear', label: 'Sannadka bilowga', numeric: true },
      { name: 'endYear', label: 'Sannadka dhammaadka', numeric: true },
      { name: 'countryIds', label: 'Dalalka (UUID JSON array)', multiline: true },
      { name: 'personIds', label: 'Dadka (UUID JSON array)', multiline: true },
      { name: 'civilizationIds', label: 'Ilbaxnimooyinka (UUID JSON array)', multiline: true },
      { name: 'sources', label: 'Ilaha (JSON sourceId/claimNote/claimStanding)', multiline: true },
    ],
    create: [
      'slug',
      'category',
      'title',
      'summary',
      'body',
      'dateDisplay',
      'startYear',
      'endYear',
      'countryIds',
      'personIds',
      'civilizationIds',
      'sources',
    ],
    update: [
      'category',
      'title',
      'summary',
      'body',
      'dateDisplay',
      'startYear',
      'endYear',
      'countryIds',
      'personIds',
      'civilizationIds',
      'sources',
    ],
  },
  figures: {
    title: 'Shakhsiyaad',
    endpoint: 'figures',
    fields: [
      { name: 'slug', label: 'Slug', required: true },
      { name: 'title', label: 'Magaca', required: true },
      { name: 'summary', label: 'Soo koobid', required: true, multiline: true },
      { name: 'body', label: 'Taariikh nololeed', required: true, multiline: true },
      { name: 'birthDateText', label: 'Taariikhda dhalashada' },
      { name: 'birthYear', label: 'Sannadka dhalashada', numeric: true },
      { name: 'deathDateText', label: 'Taariikhda dhimashada' },
      { name: 'deathYear', label: 'Sannadka dhimashada', numeric: true },
      { name: 'countryIds', label: 'Dalalka (UUID JSON array)', multiline: true },
      { name: 'eventIds', label: 'Dhacdooyinka (UUID JSON array)', multiline: true },
      { name: 'civilizationIds', label: 'Ilbaxnimooyinka (UUID JSON array)', multiline: true },
      { name: 'sources', label: 'Ilaha (JSON sourceId/claimNote/claimStanding)', multiline: true },
    ],
    create: [
      'slug',
      'title',
      'summary',
      'body',
      'birthDateText',
      'birthYear',
      'deathDateText',
      'deathYear',
      'countryIds',
      'eventIds',
      'civilizationIds',
      'sources',
    ],
    update: [
      'title',
      'summary',
      'body',
      'birthDateText',
      'birthYear',
      'deathDateText',
      'deathYear',
      'countryIds',
      'eventIds',
      'civilizationIds',
      'sources',
    ],
  },
  timelines: {
    title: 'Jadwallo',
    endpoint: 'timelines',
    fields: [
      { name: 'slug', label: 'Slug', required: true },
      { name: 'title', label: 'Cinwaan', required: true },
      { name: 'summary', label: 'Soo koobid', required: true, multiline: true },
      {
        name: 'eventIds',
        label: 'Dhacdooyinka (UUID JSON array)',
        multiline: true,
        required: true,
      },
    ],
    create: ['slug', 'title', 'summary', 'eventIds'],
    update: ['title', 'summary', 'eventIds'],
  },
  civilizations: {
    title: 'Ilbaxnimooyin',
    endpoint: 'civilizations',
    fields: [
      { name: 'slug', label: 'Slug', required: true },
      { name: 'title', label: 'Magaca', required: true },
      { name: 'summary', label: 'Soo koobid', required: true, multiline: true },
      { name: 'body', label: 'Qoraal', required: true, multiline: true },
      { name: 'region', label: 'Gobol' },
      { name: 'dateDisplay', label: 'Muddada' },
      { name: 'startYear', label: 'Sannadka bilowga', numeric: true },
      { name: 'endYear', label: 'Sannadka dhammaadka', numeric: true },
      { name: 'countryIds', label: 'Dalalka (UUID JSON array)', multiline: true },
      { name: 'eventIds', label: 'Dhacdooyinka (UUID JSON array)', multiline: true },
      { name: 'personIds', label: 'Dadka (UUID JSON array)', multiline: true },
      { name: 'sources', label: 'Ilaha (JSON sourceId/claimNote/claimStanding)', multiline: true },
    ],
    create: [
      'slug',
      'title',
      'summary',
      'body',
      'region',
      'dateDisplay',
      'startYear',
      'endYear',
      'countryIds',
      'eventIds',
      'personIds',
      'sources',
    ],
    update: [
      'title',
      'summary',
      'body',
      'region',
      'dateDisplay',
      'startYear',
      'endYear',
      'countryIds',
      'eventIds',
      'personIds',
      'sources',
    ],
  },
};

type EntityRecord = Record<string, unknown> & {
  id: string;
  slug: string;
  state: EditorialState;
  translations?: Array<Record<string, unknown>>;
};

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function readValues(record?: EntityRecord) {
  if (!record) return {};
  const translation =
    record.translations?.find((item) => item.locale === 'so') ?? record.translations?.[0];
  const values = { ...record, ...translation } as Record<string, unknown>;
  if (Array.isArray(values.sources))
    values.sources = JSON.stringify(
      values.sources.map((source) => {
        const item = source as Record<string, unknown>;
        return {
          sourceId: item.sourceId,
          claimNote: item.claimNote,
          claimStanding: item.claimStanding,
          locator: item.locator,
        };
      }),
      null,
      2,
    );
  for (const key of ['countryIds', 'eventIds', 'personIds', 'civilizationIds']) {
    if (Array.isArray(values[key])) values[key] = JSON.stringify(values[key]);
  }
  return values;
}

export function AdminEntityPage({ mode }: { mode: 'list' | 'edit' | 'new' }) {
  const params = useParams<{ entity: string; id?: string }>();
  const router = useRouter();
  const config = entities[params.entity];
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [record, setRecord] = useState<EntityRecord>();
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({ locale: 'so' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadList = useCallback(
    async (nextOffset = 0, search = '') => {
      if (!config) return;
      setBusy(true);
      setError('');
      const qs = new URLSearchParams({ limit: '30', offset: String(nextOffset) });
      if (search.trim()) qs.set('q', search.trim());
      const result = await adminFetch<PageResponse<EntityRecord>>(`${config.endpoint}?${qs}`);
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
      setBusy(false);
    },
    [config, router],
  );

  useEffect(() => {
    if (!config) return;
    if (mode === 'list') {
      void loadList();
      return;
    }
    if (mode === 'new') return;
    let active = true;
    void adminFetch<EntityRecord>(`${config.endpoint}/${params.id}`).then((result) => {
      if (!active) return;
      if (result.error === 'AUTH_REQUIRED') {
        router.replace('/admin/login');
        return;
      }
      if (result.error || !result.data) {
        setError(result.error ?? 'Xogta lama helin.');
        return;
      }
      setRecord(result.data);
      setValues({ locale: 'so', ...readValues(result.data) });
    });
    return () => {
      active = false;
    };
  }, [config, loadList, mode, params.id, router]);

  if (!config)
    return (
      <AdminFrame>
        <div className="admin-content">
          <h2>Noocan xogta lama aqoonsan.</h2>
        </div>
      </AdminFrame>
    );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const keys = mode === 'new' ? config.create : config.update;
    const body: Record<string, unknown> = { locale: 'so' };
    for (const key of keys) {
      const value = values[key];
      if (key === 'sources' || key.endsWith('Ids')) {
        try {
          body[key] = JSON.parse(typeof value === 'string' ? value.trim() || '[]' : '[]');
        } catch {
          setError(`${key} must be valid JSON.`);
          setBusy(false);
          return;
        }
      } else
        body[key] =
          key === 'startYear' || key === 'endYear' || key === 'birthYear' || key === 'deathYear'
            ? value === '' || value == null
              ? null
              : Number(value)
            : typeof value === 'string' && !value.trim()
              ? null
              : value;
    }
    const result = await adminFetch(`${config.endpoint}${mode === 'edit' ? `/${params.id}` : ''}`, {
      method: mode === 'edit' ? 'PATCH' : 'POST',
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
    router.push(`/admin/${params.entity}`);
  }

  async function transition(action: string) {
    if (!record) return;
    const rationale =
      action === 'return' || action === 'reject' ? window.prompt('Geli sababta go’aanka:') : null;
    if ((action === 'return' || action === 'reject') && !rationale?.trim()) return;
    setBusy(true);
    setError('');
    const result = await adminFetch(`${config.endpoint}/${record.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action, ...(rationale ? { rationale } : {}) }),
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
    const fresh = await adminFetch<EntityRecord>(`${config.endpoint}/${record.id}`);
    if (fresh.data) {
      setRecord(fresh.data);
      setValues({ locale: 'so', ...readValues(fresh.data) });
    }
  }

  async function archive() {
    if (!record || !window.confirm('Xogtan ma la archive-gareeyaa?')) return;
    setBusy(true);
    setError('');
    const result = await adminFetch(`${config.endpoint}/${record.id}`, { method: 'DELETE' });
    setBusy(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/admin/${params.entity}`);
  }

  if (mode === 'list')
    return (
      <AdminFrame>
        <div className="admin-content">
          <p className="admin-kicker">MAAMULKA XOGTA</p>
          <h2>{config.title}</h2>
          <div className="admin-actions-row">
            <form
              className="admin-inline-search"
              onSubmit={(e) => {
                e.preventDefault();
                void loadList(0, query);
              }}
            >
              <input
                aria-label={`Raadi ${config.title}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Raadi slug…"
              />
              <button>Raadi</button>
            </form>
            <a
              className="admin-action-button admin-publish-button"
              href={`/admin/${params.entity}/new`}
            >
              + Ku dar
            </a>
          </div>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          {busy ? (
            <p className="admin-loading" role="status">
              Xogta ayaa la soo raraya…
            </p>
          ) : rows.length === 0 ? (
            <div className="admin-empty">Xog lama helin.</div>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cinwaan</th>
                    <th>Slug</th>
                    <th>Xaalad</th>
                    <th>Wax ka beddel</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const title = textValue(readValues(row).title, '—');
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{title}</strong>
                        </td>
                        <td>{row.slug}</td>
                        <td>
                          <span className={`admin-badge ${STATE_COLORS[row.state]}`}>
                            {STATE_LABELS[row.state] ?? row.state}
                          </span>
                        </td>
                        <td>
                          <a href={`/admin/${params.entity}/${row.id}/edit`}>Fur</a>
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
                disabled={!offset || busy}
                onClick={() => void loadList(Math.max(0, offset - 30), query)}
              >
                Kii hore
              </button>
              <span>
                {offset + 1}–{Math.min(offset + rows.length, total)} / {total}
              </span>
              <button
                disabled={offset + rows.length >= total || busy}
                onClick={() => void loadList(offset + 30, query)}
              >
                Kuwa xiga
              </button>
            </div>
          )}
        </div>
      </AdminFrame>
    );

  return (
    <AdminFrame>
      <div className="admin-content">
        <div className="admin-breadcrumb">
          <a href={`/admin/${params.entity}`}>{config.title}</a>
          <span>/</span>
          {mode === 'new' ? 'Cusub' : 'Wax ka beddel'}
        </div>
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>
          {mode === 'new'
            ? `${config.title}: ku dar`
            : textValue(readValues(record).title, config.title)}
        </h2>
        {record && (
          <p>
            <span className={`admin-badge ${STATE_COLORS[record.state]}`}>
              {STATE_LABELS[record.state] ?? record.state}
            </span>
          </p>
        )}
        <form onSubmit={(e) => void save(e)}>
          <div className="admin-form-section">
            <h3>{mode === 'new' ? 'Xog cusub' : 'Xogta iyo qoraalka (Soomaali)'}</h3>
            <div className="admin-field-row">
              {config.fields.map((field) => (
                <label className="admin-field-full" key={field.name}>
                  {field.label}
                  {field.required ? ' *' : ''}
                  {field.multiline ? (
                    <textarea
                      required={field.required}
                      value={textValue(values[field.name])}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                      rows={field.name === 'body' ? 9 : 4}
                    />
                  ) : (
                    <input
                      required={field.required}
                      type={field.numeric ? 'number' : 'text'}
                      value={textValue(values[field.name])}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-form-bar">
            <button className="admin-primary-button" disabled={busy}>
              {busy ? 'Waa la kaydinayaa…' : 'Kaydi draft'}
            </button>
            <a className="admin-action-button" href={`/admin/${params.entity}`}>
              Jooji
            </a>
          </div>
        </form>
        {record && (
          <section className="admin-form-section">
            <h3>Hawlaha workflow</h3>
            <div className="admin-actions-row">
              {(record.state === 'DRAFT' || record.state === 'CHANGES_REQUESTED') && (
                <button
                  className="admin-action-button"
                  disabled={busy}
                  onClick={() => void transition('submit')}
                >
                  Gudbi dib-u-eegis
                </button>
              )}
              {record.state === 'SUBMITTED' && (
                <button
                  className="admin-action-button"
                  disabled={busy}
                  onClick={() => void transition('review')}
                >
                  Bilow dib-u-eegis
                </button>
              )}
              {record.state === 'IN_REVIEW' && (
                <>
                  <button
                    className="admin-action-button"
                    disabled={busy}
                    onClick={() => void transition('approve')}
                  >
                    Ansixi
                  </button>
                  <button
                    className="admin-action-button"
                    disabled={busy}
                    onClick={() => void transition('return')}
                  >
                    Codso sixid
                  </button>
                  <button
                    className="admin-action-button admin-danger-button"
                    disabled={busy}
                    onClick={() => void transition('reject')}
                  >
                    Diid
                  </button>
                </>
              )}
              {record.state === 'APPROVED' && (
                <button
                  className="admin-action-button admin-publish-button"
                  disabled={busy}
                  onClick={() => void transition('publish')}
                >
                  Daabac
                </button>
              )}
              {record.state !== 'ARCHIVED' && (
                <button
                  className="admin-action-button admin-danger-button"
                  disabled={busy}
                  onClick={() => void archive()}
                >
                  Archive garee
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </AdminFrame>
  );
}
