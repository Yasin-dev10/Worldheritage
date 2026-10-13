'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from './admin-frame';

type Kind = 'sources' | 'media';
type Field = {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  options?: string[];
};
type PageResponse = {
  data: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
};

const configs: Record<
  Kind,
  { title: string; endpoint: string; fields: Field[]; columns: string[] }
> = {
  sources: {
    title: 'Ilo iyo tixraacyo',
    endpoint: 'sources',
    fields: [
      {
        name: 'sourceKind',
        label: 'Nooca isha',
        required: true,
        options: [
          'PRIMARY',
          'SCHOLARLY_SECONDARY',
          'REFERENCE',
          'ORAL_HISTORY',
          'ARCHIVAL_RECORD',
          'OTHER',
        ],
      },
      { name: 'title', label: 'Cinwaanka', required: true },
      { name: 'creator', label: 'Qoraa / abuure' },
      { name: 'publisherOrCollection', label: 'Daabace ama kayd' },
      { name: 'publicationDateText', label: 'Taariikhda daabacaadda' },
      { name: 'stableIdentifier', label: 'Aqoonsi joogto ah (DOI, ISBN, iwm.)' },
      { name: 'url', label: 'URL' },
      { name: 'rightsStatus', label: 'Xuquuqda isticmaalka' },
      { name: 'rightsNotes', label: 'Faahfaahinta xuquuqda', multiline: true },
    ],
    columns: ['title', 'creator', 'sourceKind', 'publisherOrCollection', 'url', 'rightsStatus'],
  },
  media: {
    title: 'Xogta warbaahinta',
    endpoint: 'media',
    fields: [
      { name: 'storageLocation', label: 'Goobta kaydinta', required: true },
      { name: 'mediaType', label: 'Nooca MIME', required: true },
      { name: 'altText', label: 'Qoraalka beddelka ah' },
      { name: 'attribution', label: 'Aqoonsiga milkiilaha / abuuraha' },
      { name: 'provenance', label: 'Meesha ay ka timid', multiline: true },
      { name: 'license', label: 'Ruqsadda' },
      { name: 'rightsNotes', label: 'Faahfaahinta xuquuqda', multiline: true },
    ],
    columns: ['storageLocation', 'mediaType', 'altText', 'attribution', 'license', 'createdAt'],
  },
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1').replace(
  /\/$/,
  '',
);

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value) ?? '—';
}

export function AdminRecords({ kind }: { kind: Kind }) {
  const router = useRouter();
  const config = configs[kind];
  const defaults: Record<string, string> =
    kind === 'sources'
      ? { sourceKind: 'REFERENCE', rightsStatus: 'UNKNOWN' }
      : { mediaType: 'image/jpeg' };
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextOffset: number, search: string) => {
      const token = sessionStorage.getItem('wh_admin_access_token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ limit: '30', offset: String(nextOffset) });
        if (kind === 'sources' && search.trim()) params.set('q', search.trim());
        const response = await fetch(`${apiBase}/admin/${config.endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (response.status === 401) {
          sessionStorage.removeItem('wh_admin_access_token');
          router.replace('/admin/login');
          return;
        }
        if (!response.ok) throw new Error('Liiska xogta lama heli karin.');
        const result = (await response.json()) as PageResponse;
        setRows(result.data);
        setTotal(result.total);
        setOffset(result.offset);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Xogta lama heli karin.');
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint, kind, router],
  );

  useEffect(() => {
    void load(0, '');
  }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem('wh_admin_access_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiBase}/admin/${config.endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(values).map(([key, value]) => [key, value.trim() || null]),
          ),
        ),
      });
      if (response.status === 401) {
        sessionStorage.removeItem('wh_admin_access_token');
        router.replace('/admin/login');
        return;
      }
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok)
        throw new Error(result?.message ?? 'Xogta lama kaydin. Dib u eeg meelaha la buuxiyey.');
      setNotice('Xogta waa la kaydiyey. Hawsha waxaa lagu daray diiwaanka maamulka.');
      setValues(defaults);
      await load(0, query);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Xogta lama kaydin.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminFrame>
      <div className="admin-content">
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>{config.title}</h2>
        <p className="admin-lead">
          Xogtu waxay ku kaydsan tahay API-ga; gelinta binary-ga sawirrada iyo dukumentiyada weli ma
          shaqayso.
        </p>
        <form className="admin-record-form" onSubmit={create}>
          <h3>Ku dar xog cusub</h3>
          <div className="admin-field-grid">
            {config.fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.required && <span aria-hidden="true"> *</span>}
                {field.options ? (
                  <select
                    required={field.required}
                    value={values[field.name] ?? field.options[0]}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                  >
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : field.multiline ? (
                  <textarea
                    value={values[field.name] ?? ''}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    maxLength={4000}
                    rows={3}
                  />
                ) : (
                  <input
                    required={field.required}
                    value={values[field.name] ?? ''}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    maxLength={
                      field.name === 'url' || field.name === 'storageLocation' ? 2048 : 1000
                    }
                    type={field.name === 'url' ? 'url' : 'text'}
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="admin-success" role="status">
              {notice}
            </p>
          )}
          <button className="admin-primary-button" disabled={saving}>
            {saving ? 'Waa la kaydinayaa…' : 'Kaydi xogta'}
          </button>
        </form>
        <section className="admin-activity">
          <div className="admin-list-heading">
            <div>
              <p className="admin-kicker">LIISKA KAYDSAN</p>
              <h3>{total} diiwaan</h3>
            </div>
            {kind === 'sources' && (
              <form
                className="admin-inline-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(0, query);
                }}
              >
                <input
                  aria-label="Raadi ilo"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Raadi cinwaan ama qoraa"
                />
                <button>Raadi</button>
              </form>
            )}
          </div>
          {loading ? (
            <p role="status">Liiska ayaa la soo raraya…</p>
          ) : rows.length === 0 ? (
            <p>Weli diiwaan ma jiro.</p>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row.id)}>
                      {config.columns.map((column) => (
                        <td key={column}>{cellText(row[column])}</td>
                      ))}
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
        </section>
      </div>
    </AdminFrame>
  );
}
