'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch, STATE_LABELS, STATE_COLORS, type AdminCountry } from '@/lib/admin-api';

type Props = { params: Promise<{ id: string }> };

export default function AdminCountryEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [country, setCountry] = useState<AdminCountry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ isoAlpha2: '', region: '', title: '', summary: '', body: '' });

  useEffect(() => {
    void (async () => {
      const result = await adminFetch<AdminCountry>(`countries/${id}`);
      if (result.error === 'AUTH_REQUIRED') {
        router.replace('/admin/login');
        return;
      }
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (result.data) {
        setCountry(result.data);
        const translation = result.data.revisions?.[0]?.translations?.find(
          (item) => item.locale === 'so',
        );
        setForm({
          isoAlpha2: result.data.isoAlpha2 ?? '',
          region: result.data.region ?? '',
          title: translation?.title ?? '',
          summary: translation?.summary ?? '',
          body: translation?.body ?? '',
        });
      }
      setLoading(false);
    })();
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const translation = country?.revisions?.[0]?.translations?.find((item) => item.locale === 'so');
    const translationChanged =
      !!translation &&
      (translation.title !== form.title ||
        translation.summary !== form.summary ||
        translation.body !== form.body);
    const result = await adminFetch(`countries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        isoAlpha2: form.isoAlpha2.trim() || null,
        region: form.region.trim() || null,
        ...(translationChanged
          ? { title_so: form.title, summary_so: form.summary, body_so: form.body }
          : {}),
      }),
    });
    setSaving(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    const fresh = await adminFetch<AdminCountry>(`countries/${id}`);
    if (fresh.data) {
      setCountry(fresh.data);
      const latest = fresh.data.revisions?.[0]?.translations?.find((item) => item.locale === 'so');
      setForm((current) => ({
        ...current,
        title: latest?.title ?? '',
        summary: latest?.summary ?? '',
        body: latest?.body ?? '',
      }));
    }
    setNotice(
      translationChanged
        ? 'Revision cusub oo draft ah ayaa la sameeyay.'
        : 'Xogta waa la cusboonaysiiyay.',
    );
  }

  async function handleArchive() {
    setArchiving(true);
    setError('');
    const result = await adminFetch(`countries/${id}`, { method: 'DELETE' });
    setArchiving(false);
    setConfirmArchive(false);
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/admin/countries');
  }

  async function handleWorkflow(action: string) {
    if (action === 'return' || action === 'reject') {
      const rationale = window.prompt('Geli sababta go’aanka:');
      if (!rationale?.trim()) return;
      await sendWorkflow(action, rationale);
      return;
    }
    await sendWorkflow(action);
  }

  async function sendWorkflow(action: string, rationale?: string) {
    setSaving(true);
    setError('');
    const result = await adminFetch(`countries/${id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action, ...(rationale ? { rationale } : {}) }),
    });
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) setError(result.error);
    else {
      setNotice('Xaaladda dib ayaa loo cusboonaysiiyay.');
      const fresh = await adminFetch<AdminCountry>(`countries/${id}`);
      if (fresh.data) setCountry(fresh.data);
    }
    setSaving(false);
  }

  const state = country?.revisions?.[0]?.state ?? country?.latestRevision?.state;
  const currentTitle = country?.revisions?.[0]?.translations?.find(
    (item) => item.locale === 'so',
  )?.title;

  return (
    <AdminFrame>
      <div className="admin-content">
        <div className="admin-breadcrumb">
          <a href="/admin/countries">Dalalka</a>
          <span>/</span>
          Wax ka beddel
        </div>
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        {loading ? (
          <p className="admin-loading" role="status">
            Xogta dalka ayaa la soo raraya…
          </p>
        ) : error && !country ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : country ? (
          <>
            <h2>{currentTitle ?? country.latestRevision?.title ?? country.slug}</h2>
            {state && (
              <div className="admin-actions-row">
                <span className={`admin-badge ${STATE_COLORS[state]}`}>{STATE_LABELS[state]}</span>
              </div>
            )}
            {state && (
              <section className="admin-form-section">
                <h3>Hawlaha workflow</h3>
                <div className="admin-actions-row">
                  {(state === 'DRAFT' || state === 'CHANGES_REQUESTED') && (
                    <button
                      className="admin-action-button"
                      disabled={saving}
                      onClick={() => void handleWorkflow('submit')}
                    >
                      Gudbi dib-u-eegis
                    </button>
                  )}
                  {state === 'SUBMITTED' && (
                    <button
                      className="admin-action-button"
                      disabled={saving}
                      onClick={() => void handleWorkflow('review')}
                    >
                      Bilow dib-u-eegis
                    </button>
                  )}
                  {state === 'IN_REVIEW' && (
                    <>
                      <button
                        className="admin-action-button"
                        disabled={saving}
                        onClick={() => void handleWorkflow('approve')}
                      >
                        Ansixi
                      </button>
                      <button
                        className="admin-action-button"
                        disabled={saving}
                        onClick={() => void handleWorkflow('return')}
                      >
                        Codso sixid
                      </button>
                      <button
                        className="admin-action-button admin-danger-button"
                        disabled={saving}
                        onClick={() => void handleWorkflow('reject')}
                      >
                        Diid
                      </button>
                    </>
                  )}
                  {state === 'APPROVED' && (
                    <button
                      className="admin-action-button admin-publish-button"
                      disabled={saving}
                      onClick={() => void handleWorkflow('publish')}
                    >
                      Daabac
                    </button>
                  )}
                </div>
              </section>
            )}
            <form onSubmit={handleSave}>
              <div className="admin-form-section">
                <h3>Macluumaadka aasaasiga ah</h3>
                <div className="admin-field-row">
                  <label className="admin-field-full">
                    Slug (ma beddeli kartid)
                    <input readOnly value={country.slug} style={{ opacity: 0.6 }} />
                  </label>
                  <label className="admin-field-full">
                    ISO Alpha-2
                    <input
                      value={form.isoAlpha2}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          isoAlpha2: e.target.value.toUpperCase().slice(0, 2),
                        }))
                      }
                      maxLength={2}
                      placeholder="SO"
                    />
                  </label>
                </div>
                <label className="admin-field-full">
                  Region / Gobol
                  <input
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                    maxLength={200}
                    placeholder="Horn of Africa"
                  />
                </label>
              </div>
              <div className="admin-form-section">
                <h3>Qoraalka Soomaaliga</h3>
                <label className="admin-field-full">
                  Cinwaan
                  <input
                    required
                    maxLength={500}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </label>
                <label className="admin-field-full">
                  Soo koobid
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  />
                </label>
                <label className="admin-field-full">
                  Qoraal
                  <textarea
                    required
                    rows={9}
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </label>
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
              <div className="admin-form-bar">
                <button className="admin-primary-button" disabled={saving}>
                  {saving ? 'Waa la keydinayaa…' : 'Kaydi isbeddelka'}
                </button>
                <button
                  type="button"
                  className="admin-action-button admin-danger-button"
                  onClick={() => setConfirmArchive(true)}
                >
                  Archive
                </button>
                <a href="/admin/countries" className="admin-action-button">
                  Ka noqo
                </a>
              </div>
            </form>
          </>
        ) : null}
      </div>
      {confirmArchive && (
        <div className="admin-confirm-dialog" role="dialog" aria-modal="true">
          <div className="admin-confirm-box">
            <h3>Archive dalka?</h3>
            <p>
              Tani waxay archive-gareysaa dhammaan noocyada dalka. Ma daabici kartid content
              archived ah. Ficilkaan waa la diiwaan-gelin doonaa.
            </p>
            <div className="admin-confirm-actions">
              <button className="admin-action-button" onClick={() => setConfirmArchive(false)}>
                Jooji
              </button>
              <button
                className="admin-action-button admin-danger-button"
                disabled={archiving}
                onClick={() => void handleArchive()}
              >
                {archiving ? 'Waa la archive-gareynayaa…' : 'Haa, archive-garee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminFrame>
  );
}
