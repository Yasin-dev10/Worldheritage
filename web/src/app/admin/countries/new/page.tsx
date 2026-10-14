'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch } from '@/lib/admin-api';

export default function AdminCountryNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    slug: '',
    isoAlpha2: '',
    region: '',
    title: '',
    summary: '',
    body: '',
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
      .slice(0, 120);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const result = await adminFetch('countries', {
      method: 'POST',
      body: JSON.stringify({
        slug: form.slug || autoSlug(form.title),
        isoAlpha2: form.isoAlpha2.trim() || null,
        region: form.region.trim() || null,
        title_so: form.title,
        summary_so: form.summary,
        body_so: form.body,
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
    router.push('/admin/countries');
  }

  return (
    <AdminFrame>
      <div className="admin-content">
        <div className="admin-breadcrumb">
          <a href="/admin/countries">Dalalka</a>
          <span>/</span>
          Dal cusub
        </div>
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        <h2>Ku dar dal cusub</h2>
        <p className="admin-lead">
          Draft ayaa si toos ah loo abuuri doonaa. Daabacaadda waxay u baahan tahay dib-u-eegis iyo
          ansixinta.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-section">
            <h3>Macluumaadka aasaasiga ah</h3>
            <div className="admin-field-row">
              <label className="admin-field-full">
                Magaca dalka (Soomaali) *
                <input
                  required
                  value={form.title}
                  onChange={(e) => {
                    set('title', e.target.value);
                    if (!form.slug) set('slug', autoSlug(e.target.value));
                  }}
                  maxLength={500}
                  placeholder="Tusaale: Soomaaliya"
                />
              </label>
              <label className="admin-field-full">
                Slug *
                <input
                  required
                  value={form.slug}
                  onChange={(e) =>
                    set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  maxLength={120}
                  pattern="[a-z0-9-]+"
                  placeholder="tusaale: soomaaliya"
                />
              </label>
            </div>
            <div className="admin-field-row">
              <label className="admin-field-full">
                ISO Alpha-2 (haddii la hayo)
                <input
                  value={form.isoAlpha2}
                  onChange={(e) => set('isoAlpha2', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  placeholder="SO"
                />
              </label>
              <label className="admin-field-full">
                Region / Gobol
                <input
                  value={form.region}
                  onChange={(e) => set('region', e.target.value)}
                  maxLength={200}
                  placeholder="Tusaale: Horn of Africa"
                />
              </label>
            </div>
          </div>
          <div className="admin-form-section">
            <h3>Qoraalka (Soomaali)</h3>
            <label className="admin-field-full">
              Soo koobid *
              <textarea
                required
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Soo koobid gaaban oo ku saabsan dalka…"
              />
            </label>
            <label className="admin-field-full">
              Qoraalka buuxa *
              <textarea
                required
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="Qoraalka taariikhiga ah ee buuxa…"
              />
            </label>
          </div>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-form-bar">
            <button className="admin-primary-button" disabled={saving}>
              {saving ? 'Waa la kaydinayaa…' : 'Kaydi draft'}
            </button>
            <a href="/admin/countries" className="admin-action-button">
              Jooji
            </a>
          </div>
        </form>
      </div>
    </AdminFrame>
  );
}
