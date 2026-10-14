'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch } from '@/lib/admin-api';

export default function AdminArticleNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');
  const [form, setForm] = useState({
    slug: '',
    authorName: '',
    editorName: '',
    title: '',
    summary: '',
    body: '',
    sources: '[]',
    countryIds: '[]',
    eventIds: '[]',
    personIds: '[]',
    civilizationIds: '[]',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    let relationships: Record<string, unknown>;
    try {
      relationships = Object.fromEntries(
        ['sources', 'countryIds', 'eventIds', 'personIds', 'civilizationIds'].map((key) => [
          key,
          JSON.parse(form[key as keyof typeof form]) as unknown,
        ]),
      );
    } catch {
      setError('Ilaha iyo aqoonsiyada la xiriira waa inay noqdaan JSON sax ah.');
      setSaving(false);
      return;
    }
    const result = await adminFetch('articles', {
      method: 'POST',
      body: JSON.stringify({
        slug: form.slug || autoSlug(form.title),
        authorName: form.authorName,
        editorName: form.editorName || null,
        locale: 'so',
        title: form.title,
        summary: form.summary,
        body: form.body,
        ...relationships,
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
    router.push('/admin/articles');
  }

  return (
    <AdminFrame>
      <div className="admin-content">
        <div className="admin-breadcrumb">
          <a href="/admin/articles">Maqaallada</a>
          <span>/</span>
          Maqaal cusub
        </div>
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>Maqaal cusub samee</h2>
        <p className="admin-lead">
          Maqaalku wuxuu bilaabi doonaa xaaladda Draft. Gudbinta dib-u-eegista ka dib, wuxuu u
          baahan doonaa ansixinta ka hor inta aan la daabicin.
        </p>

        <div className="admin-form-tabs">
          <button
            className={`admin-tab ${activeTab === 'content' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('content')}
            type="button"
          >
            Qoraalka
          </button>
          <button
            className={`admin-tab ${activeTab === 'metadata' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('metadata')}
            type="button"
          >
            Xogta dheeraadka ah
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'content' && (
            <div className="admin-form-section">
              <h3>Qoraalka maqaalka (Soomaali)</h3>
              <label className="admin-field-full">
                Cinwaanka *
                <input
                  required
                  value={form.title}
                  onChange={(e) => {
                    set('title', e.target.value);
                    if (!form.slug) set('slug', autoSlug(e.target.value));
                  }}
                  maxLength={500}
                  placeholder="Cinwaanka maqaalka…"
                />
              </label>
              <label className="admin-field-full">
                Soo koobid *
                <textarea
                  required
                  value={form.summary}
                  onChange={(e) => set('summary', e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Soo koobid gaaban (1–3 jumle)…"
                />
              </label>
              <label className="admin-field-full">
                Qoraalka buuxa *
                <textarea
                  required
                  value={form.body}
                  onChange={(e) => set('body', e.target.value)}
                  placeholder="Qoraalka maqaalka…"
                />
              </label>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="admin-form-section">
              <h3>Xogta dheeraadka ah</h3>
              <div className="admin-field-row">
                <label className="admin-field-full">
                  Slug *
                  <input
                    required
                    value={form.slug}
                    onChange={(e) =>
                      set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    maxLength={200}
                    pattern="[a-z0-9-]+"
                    placeholder="cinwaan-maqaalka"
                  />
                </label>
                <label className="admin-field-full">
                  Luuqadda
                  <input readOnly value="so (Soomaali)" style={{ opacity: 0.6 }} />
                </label>
              </div>
              <label className="admin-field-full">
                Ilaha (JSON: sourceId, claimNote, claimStanding, locator)
                <textarea
                  required
                  value={form.sources}
                  onChange={(e) => set('sources', e.target.value)}
                  rows={5}
                  placeholder='[{"sourceId":"UUID","claimNote":"Sheegashada uu taageerayo","claimStanding":"WELL_SUPPORTED"}]'
                />
              </label>
              {(['countryIds', 'eventIds', 'personIds', 'civilizationIds'] as const).map(
                (field) => (
                  <label className="admin-field-full" key={field}>
                    {field} · aqoonsiyo UUID ah oo JSON array ah
                    <textarea
                      value={form[field]}
                      onChange={(e) => set(field, e.target.value)}
                      rows={2}
                      placeholder="[]"
                    />
                  </label>
                ),
              )}
              <div className="admin-field-row">
                <label className="admin-field-full">
                  Magaca qoraaga *
                  <input
                    required
                    value={form.authorName}
                    onChange={(e) => set('authorName', e.target.value)}
                    maxLength={500}
                    placeholder="Magaca buuxa…"
                  />
                </label>
                <label className="admin-field-full">
                  Tifaftiraha (haddii jiro)
                  <input
                    value={form.editorName}
                    onChange={(e) => set('editorName', e.target.value)}
                    maxLength={500}
                    placeholder="Magaca tifaftiraha…"
                  />
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-form-bar">
            <button className="admin-primary-button" disabled={saving}>
              {saving ? 'Waa la kaydinayaa…' : 'Kaydi draft'}
            </button>
            <a href="/admin/articles" className="admin-action-button">
              Jooji
            </a>
          </div>
        </form>
      </div>
    </AdminFrame>
  );
}
