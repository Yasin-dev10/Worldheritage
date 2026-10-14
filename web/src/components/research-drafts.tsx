import Link from 'next/link';
import { apiGet, type CollectionResponse, type Locale } from '@/lib/api';
import { SiteFooter, SiteHeader } from '@/components/site';

type ResearchDraft = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  body?: string;
  locale: 'so';
  editorialStatus: 'RESEARCH_DRAFT';
  historicalVerification: string;
  sources?: Array<{
    locator: string | null;
    claimNote: string;
    claimStanding: string;
    source: {
      title: string;
      creator: string | null;
      publisherOrCollection: string | null;
      publicationDateText: string | null;
      url: string | null;
    };
  }>;
};

function DraftNotice({ locale }: { locale: Locale }) {
  return (
    <aside className="api-state" role="note" style={{ margin: '20px 0' }}>
      <div>
        <strong>{locale === 'so' ? 'Research Draft · Lama xaqiijin' : 'Research Draft · Unverified'}</strong>
        <p>
          {locale === 'so'
            ? 'Qoraalladani waa xog cilmi-baaris oo hordhac ah. Sheegasho kasta weli lama xaqiijin; ilaha ku lifaaqan waa in lala barbar dhigo qoraalka oo uu reviewer dib u eego.'
            : 'These are preliminary research records. Claims have not been verified; cited sources must be checked against the text by a reviewer.'}
        </p>
      </div>
    </aside>
  );
}

export async function ResearchDraftDirectory({
  locale,
  query,
}: {
  locale: Locale;
  query: string;
}) {
  const params = new URLSearchParams({ limit: '100' });
  if (query.length >= 2) params.set('q', query);
  const result = await apiGet<CollectionResponse<ResearchDraft> & { historicalVerification?: string }>(
    `research-drafts?${params.toString()}`,
  );
  const records = result.data?.data ?? [];
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap">
        <div className="page-intro">
          <p className="eyebrow">{locale === 'so' ? 'Kayd cilmi-baaris' : 'Research collection'}</p>
          <h1>{locale === 'so' ? 'Taariikhda iyo dhaqanka Soomaalida' : 'Somali history and culture'}</h1>
          <p className="intro-copy">
            {locale === 'so'
              ? 'Qoraallo hordhac ah oo ku saabsan taariikhda, bulshooyinka, afafka iyo dhaqamada Soomaalida. Waxay ku jiraan marxaladda cilmi-baarista.'
              : 'Preliminary records about Somali history, communities, languages, and cultures. These items remain under research review.'}
          </p>
        </div>
        <DraftNotice locale={locale} />
        <form className="search-form filters-form" action="/research">
          <input
            type="search"
            name="q"
            minLength={2}
            maxLength={100}
            defaultValue={query}
            placeholder={locale === 'so' ? 'Raadi qoraallada…' : 'Search records…'}
            aria-label={locale === 'so' ? 'Raadi qoraallada' : 'Search records'}
          />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit">{locale === 'so' ? 'Raadi' : 'Search'} ↗</button>
        </form>
        {result.unavailable ? (
          <p className="api-state-inline">
            {locale === 'so' ? 'Xogta hadda lama heli karo.' : 'Research records are unavailable right now.'}
          </p>
        ) : records.length ? (
          <section className="country-grid section" aria-label={locale === 'so' ? 'Qoraallada cilmi-baarista' : 'Research drafts'}>
            {records.map((record) => (
              <Link className="country-card" key={record.id} href={`/research/${record.slug}?locale=${locale}`}>
                <span className="country-code">{locale === 'so' ? 'QORAAL HORDHAC AH' : 'RESEARCH DRAFT'}</span>
                <h2>{record.title}</h2>
                <p>{record.summary}</p>
              </Link>
            ))}
          </section>
        ) : (
          <p className="api-state-inline">{locale === 'so' ? 'Qoraal lama helin.' : 'No research records found.'}</p>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

export async function ResearchDraftEntry({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const result = await apiGet<ResearchDraft>(`research-drafts/${encodeURIComponent(slug)}`);
  const record = result.data;
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap">
        {record ? (
          <>
            <div className="page-intro">
              <p className="eyebrow">
                <Link href={`/research?locale=${locale}`}>{locale === 'so' ? '← Kaydka cilmi-baarista' : '← Research collection'}</Link>
              </p>
              <h1>{record.title}</h1>
              <p className="intro-copy">{record.summary}</p>
            </div>
            <DraftNotice locale={locale} />
            <article className="country-detail">
              <div className="detail-metadata">
                <span>{locale === 'so' ? 'Xaalad: Research Draft' : 'Status: Research Draft'}</span>
                <span>{locale === 'so' ? 'Sheegashooyinka lama xaqiijin' : 'Claims not verified'}</span>
              </div>
              <div className="content-body">{record.body}</div>
              {!!record.sources?.length && (
                <section className="detail-related">
                  <h2>{locale === 'so' ? 'Ilaha baaritaanka' : 'Research sources'}</h2>
                  <p>{locale === 'so' ? 'Ilahani weli ma aha caddayn ah in sheegasho kasta ay taageerayaan.' : 'These sources have not yet been confirmed to support every claim.'}</p>
                  <ul>
                    {record.sources.map((entry, index) => (
                      <li key={`${entry.source.title}-${index}`}>
                        <strong>
                          {entry.source.url ? (
                            <a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title}</a>
                          ) : entry.source.title}
                        </strong>
                        {entry.source.creator ? ` — ${entry.source.creator}` : ''}
                        {entry.locator ? `, ${entry.locator}` : ''}
                        <p>{entry.claimNote}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          </>
        ) : (
          <div className="page-intro">
            <h1>{locale === 'so' ? 'Qoraalkan lama helin' : 'Research record not found'}</h1>
            <Link href={`/research?locale=${locale}`}>{locale === 'so' ? 'Ku noqo kaydka cilmi-baarista' : 'Return to research collection'}</Link>
          </div>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
