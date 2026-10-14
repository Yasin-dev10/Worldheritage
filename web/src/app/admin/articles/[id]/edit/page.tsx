'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminFrame } from '@/components/admin-frame';
import { adminFetch, type EditorialState, STATE_LABELS, STATE_COLORS } from '@/lib/admin-api';

type ArticleDetail = {
  id: string;
  slug: string;
  authorName: string;
  editorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  state: EditorialState;
  title: string;
  summary: string;
  body: string;
  locale: string;
  sources: Array<{
    sourceId: string;
    claimNote: string;
    claimStanding: string;
    locator: string | null;
  }>;
  countries: Array<{ countryId: string }>;
  events: Array<{ eventId: string }>;
  people: Array<{ personId: string }>;
  civilizations: Array<{ civilizationId: string }>;
};

type WorkflowAction = {
  id: string;
  label: string;
  className: string;
  endpoint: string;
  method: string;
  needsRationale?: boolean;
  allowedStates: EditorialState[];
};

const WORKFLOW_ACTIONS: WorkflowAction[] = [
  {
    id: 'submit',
    label: 'Gudbi dib-u-eegista',
    className: 'admin-action-button',
    endpoint: 'submit',
    method: 'POST',
    allowedStates: ['DRAFT', 'CHANGES_REQUESTED'],
  },
  {
    id: 'review',
    label: 'Bilow dib-u-eegista',
    className: 'admin-action-button',
    endpoint: 'review',
    method: 'POST',
    allowedStates: ['SUBMITTED'],
  },
  {
    id: 'approve',
    label: 'Ansiixi',
    className: 'admin-action-button admin-approve-button',
    endpoint: 'approve',
    method: 'POST',
    allowedStates: ['IN_REVIEW'],
  },
  {
    id: 'return',
    label: 'Dib u celi sixid',
    className: 'admin-action-button',
    endpoint: 'return',
    method: 'POST',
    needsRationale: true,
    allowedStates: ['IN_REVIEW'],
  },
  {
    id: 'reject',
    label: 'Diid',
    className: 'admin-action-button admin-danger-button',
    endpoint: 'reject',
    method: 'POST',
    needsRationale: true,
    allowedStates: ['IN_REVIEW', 'SUBMITTED'],
  },
  {
    id: 'publish',
    label: 'Daabac',
    className: 'admin-action-button admin-publish-button',
    endpoint: 'publish',
    method: 'POST',
    allowedStates: ['APPROVED'],
  },
];

const WORKFLOW_STEPS: { state: EditorialState; label: string }[] = [
  { state: 'DRAFT', label: 'Qabyo' },
  { state: 'SUBMITTED', label: 'Gudbiyay' },
  { state: 'IN_REVIEW', label: 'Dib-u-eegis' },
  { state: 'APPROVED', label: 'Ansixiyay' },
  { state: 'PUBLISHED', label: 'Daabacay' },
];

const STATE_ORDER: Partial<Record<EditorialState, number>> = {
  DRAFT: 0,
  SUBMITTED: 1,
  IN_REVIEW: 2,
  CHANGES_REQUESTED: 2,
  APPROVED: 3,
  PUBLISHED: 4,
};

type Props = { params: Promise<{ id: string }> };

export default function AdminArticleEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [rationale, setRationale] = useState('');
  const [rationaleFor, setRationaleFor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'metadata' | 'workflow'>('content');
  const [form, setForm] = useState({
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

  async function reload() {
    const result = await adminFetch<ArticleDetail>(`articles/${id}`);
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
      setArticle(result.data);
      setForm({
        authorName: result.data.authorName,
        editorName: result.data.editorName ?? '',
        title: result.data.title,
        summary: result.data.summary,
        body: result.data.body,
        sources: JSON.stringify(
          result.data.sources.map(({ sourceId, claimNote, claimStanding, locator }) => ({
            sourceId,
            claimNote,
            claimStanding,
            locator,
          })),
          null,
          2,
        ),
        countryIds: JSON.stringify(result.data.countries.map((relation) => relation.countryId)),
        eventIds: JSON.stringify(result.data.events.map((relation) => relation.eventId)),
        personIds: JSON.stringify(result.data.people.map((relation) => relation.personId)),
        civilizationIds: JSON.stringify(
          result.data.civilizations.map((relation) => relation.civilizationId),
        ),
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
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
    const result = await adminFetch(`articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        authorName: form.authorName,
        editorName: form.editorName || null,
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
    setNotice('Maqaalka waa la cusboonaysiiyay.');
    await reload();
  }

  async function doAction(action: WorkflowAction) {
    if (action.needsRationale && !rationaleFor) {
      setRationaleFor(action.id);
      return;
    }
    setActioning(action.id);
    setError('');
    setNotice('');
    const body: Record<string, string> = {};
    if (action.needsRationale && rationale) body.rationale = rationale;
    const result = await adminFetch(`articles/${id}/${action.endpoint}`, {
      method: action.method,
      body: JSON.stringify(body),
    });
    setActioning(null);
    setRationaleFor(null);
    setRationale('');
    if (result.error === 'AUTH_REQUIRED') {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(`Ficilka "${action.label}" waa la fulinayay.`);
    await reload();
  }

  async function handleArchive() {
    setActioning('archive');
    const result = await adminFetch(`articles/${id}`, { method: 'DELETE' });
    setActioning(null);
    setConfirmArchive(false);
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

  const currentStateOrder = article ? (STATE_ORDER[article.state] ?? -1) : -1;

  return (
    <AdminFrame>
      <div className="admin-content">
        <div className="admin-breadcrumb">
          <a href="/admin/articles">Maqaallada</a>
          <span>/</span>
          Wax ka beddel
        </div>
        <p className="admin-kicker">MAAMULKA XOGTA</p>
        {loading ? (
          <p className="admin-loading" role="status">
            Maqaalka ayaa la soo raraya…
          </p>
        ) : error && !article ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : article ? (
          <>
            <h2>{article.title}</h2>
            <div className="admin-actions-row">
              <span className={`admin-badge ${STATE_COLORS[article.state]}`}>
                {STATE_LABELS[article.state]}
              </span>
              {article.publishedAt && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  La daabacay: {new Date(article.publishedAt).toLocaleDateString('so-SO')}
                </span>
              )}
            </div>

            {/* Workflow progress bar */}
            <div className="admin-workflow-bar" aria-label="Marxaladaha editorial">
              {WORKFLOW_STEPS.map((step, i) => {
                const stepOrder = STATE_ORDER[step.state] ?? 0;
                const isDone = stepOrder < currentStateOrder;
                const isActive =
                  step.state === article.state ||
                  (step.state === 'IN_REVIEW' && article.state === 'CHANGES_REQUESTED');
                return (
                  <span
                    key={step.state}
                    className="admin-workflow-step"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {i > 0 && <span className="admin-workflow-sep">›</span>}
                    <span className={isDone ? 'done' : isActive ? 'active' : ''}>
                      {isDone ? '✓ ' : ''}
                      {step.label}
                    </span>
                  </span>
                );
              })}
            </div>

            <div className="admin-form-tabs">
              {(['content', 'metadata', 'workflow'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`admin-tab ${activeTab === tab ? 'admin-tab-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab === 'content'
                    ? 'Qoraalka'
                    : tab === 'metadata'
                      ? 'Xogta dheeraadka'
                      : 'Workflow'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave}>
              {activeTab === 'content' && (
                <div className="admin-form-section">
                  <h3>Qoraalka maqaalka (Soomaali)</h3>
                  <label className="admin-field-full">
                    Cinwaanka *
                    <input
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      maxLength={500}
                    />
                  </label>
                  <label className="admin-field-full">
                    Soo koobid *
                    <textarea
                      required
                      value={form.summary}
                      onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                      maxLength={2000}
                      rows={3}
                    />
                  </label>
                  <label className="admin-field-full">
                    Qoraalka buuxa *
                    <textarea
                      required
                      value={form.body}
                      onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              {activeTab === 'metadata' && (
                <div className="admin-form-section">
                  <h3>Xogta dheeraadka ah</h3>
                  <div className="admin-field-row">
                    <label className="admin-field-full">
                      Magaca qoraaga *
                      <input
                        required
                        value={form.authorName}
                        onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                        maxLength={500}
                      />
                    </label>
                    <label className="admin-field-full">
                      Tifaftiraha
                      <input
                        value={form.editorName}
                        onChange={(e) => setForm((f) => ({ ...f, editorName: e.target.value }))}
                        maxLength={500}
                      />
                    </label>
                  </div>
                  <label className="admin-field-full">
                    Ilaha iyo sheegashooyinka (JSON)
                    <textarea
                      rows={6}
                      value={form.sources}
                      onChange={(e) => setForm((f) => ({ ...f, sources: e.target.value }))}
                    />
                  </label>
                  {(['countryIds', 'eventIds', 'personIds', 'civilizationIds'] as const).map(
                    (field) => (
                      <label className="admin-field-full" key={field}>
                        {field} (UUID JSON array)
                        <textarea
                          rows={2}
                          value={form[field]}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                        />
                      </label>
                    ),
                  )}
                  <div className="admin-field-row">
                    <label className="admin-field-full">
                      Slug (ma beddeli kartid)
                      <input readOnly value={article.slug} style={{ opacity: 0.6 }} />
                    </label>
                    <label className="admin-field-full">
                      Luuqadda
                      <input readOnly value={article.locale} style={{ opacity: 0.6 }} />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'workflow' && (
                <div className="admin-form-section">
                  <h3>Hawlaha workflow</h3>
                  <div className="admin-actions-row" style={{ flexWrap: 'wrap' }}>
                    {WORKFLOW_ACTIONS.filter((a) => a.allowedStates.includes(article.state)).map(
                      (action) => (
                        <button
                          key={action.id}
                          type="button"
                          className={action.className}
                          disabled={!!actioning}
                          onClick={() => void doAction(action)}
                        >
                          {actioning === action.id ? 'Waa la fuliyaa…' : action.label}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      className="admin-action-button admin-danger-button"
                      onClick={() => setConfirmArchive(true)}
                      disabled={!!actioning}
                    >
                      Archive
                    </button>
                  </div>

                  {rationaleFor && (
                    <div className="admin-review-panel">
                      <h4>Sababta (loo baahan yahay)</h4>
                      <textarea
                        value={rationale}
                        onChange={(e) => setRationale(e.target.value)}
                        placeholder="Sharax sababta ficilka…"
                        required
                      />
                      <div className="admin-confirm-actions" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="admin-action-button"
                          onClick={() => {
                            setRationaleFor(null);
                            setRationale('');
                          }}
                        >
                          Jooji
                        </button>
                        <button
                          type="button"
                          className="admin-action-button admin-approve-button"
                          disabled={!rationale.trim() || !!actioning}
                          onClick={() => {
                            const action = WORKFLOW_ACTIONS.find((a) => a.id === rationaleFor);
                            if (action) void doAction(action);
                          }}
                        >
                          Xaqiiji
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {activeTab !== 'workflow' && (
                <div className="admin-form-bar">
                  <button className="admin-primary-button" disabled={saving}>
                    {saving ? 'Waa la kaydinayaa…' : 'Kaydi isbeddelka'}
                  </button>
                  <a href="/admin/articles" className="admin-action-button">
                    Ka noqo
                  </a>
                </div>
              )}
            </form>
          </>
        ) : null}
      </div>

      {confirmArchive && (
        <div className="admin-confirm-dialog" role="dialog" aria-modal="true">
          <div className="admin-confirm-box">
            <h3>Archive maqaalka?</h3>
            <p>
              Maqaalka waa la archive-garayn doonaa. Waxaad ku soo celin kartaa maamulka haddii loo
              baahdo.
            </p>
            <div className="admin-confirm-actions">
              <button className="admin-action-button" onClick={() => setConfirmArchive(false)}>
                Jooji
              </button>
              <button
                className="admin-action-button admin-danger-button"
                disabled={actioning === 'archive'}
                onClick={() => void handleArchive()}
              >
                {actioning === 'archive' ? 'Waa la archive-gareynayaa…' : 'Haa, archive-garee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminFrame>
  );
}
