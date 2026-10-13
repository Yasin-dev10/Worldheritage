import Link from 'next/link';
import {
  apiGet,
  collections,
  type CollectionKey,
  type CollectionResponse,
  type Country,
  type Locale,
  type PublicContent,
} from '@/lib/api';
import { ApiState, PageIntro, SiteFooter, SiteHeader } from '@/components/site';

const descriptions: Record<CollectionKey, Record<Locale, string>> = {
  countries: {
    so: 'Sahami taariikhda dalalka iyo ilaha lagu saleeyay xogta la daabacay.',
    en: 'Explore national histories and the sources behind published records.',
  },
  events: {
    so: 'Raadi dhacdooyin taariikheed, taariikhdooda iyo xiriirrada la xaqiijiyay.',
    en: 'Explore historical events, their dates, and documented connections.',
  },
  figures: {
    so: 'Baro dadka taariikhiga ah adigoo eegaya nolol iyo tixraacyo la hubin karo.',
    en: 'Learn about historical figures through biographies and traceable references.',
  },
  timelines: {
    so: 'Raac dhacdooyinka siday taariikh ahaan u kala horreeyaan.',
    en: 'Follow events in chronological order, including uncertain dates.',
  },
  civilizations: {
    so: 'Sahami ilbaxnimooyinka iyo diiwaannada la daabacay.',
    en: 'Explore civilizations and their published historical records.',
  },
  history: {
    so: 'Akhri qoraallo tifaftiran oo leh qoraa, tixraacyo iyo xog daabacaad.',
    en: 'Read reviewed stories with authorship, references, and publication details.',
  },
};

function ArticleBody({ body, locale }: { body: string; locale: Locale }) {
  const lines = body.split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) return [];
    const text = match[2].trim();
    const id = `${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}-${index}`;
    return [{ index, text, id, level: match[1].length }];
  });
  return (
    <>
      {headings.length >= 3 && (
        <nav
          className="article-toc"
          aria-label={locale === 'so' ? 'Tusmada qoraalka' : 'Article contents'}
        >
          <h2>{locale === 'so' ? 'Tusmada' : 'Contents'}</h2>
          <ol>
            {headings.map((heading) => (
              <li key={heading.id} style={{ marginInlineStart: `${(heading.level - 1) * 14}px` }}>
                <a href={`#${heading.id}`}>{heading.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="country-body article-body" lang={locale}>
        {lines.map((line, index) => {
          const heading = headings.find((item) => item.index === index);
          if (heading)
            return (
              <h2 key={heading.id} id={heading.id}>
                {heading.text}
              </h2>
            );
          return line.trim() ? <p key={`p-${index}`}>{line}</p> : null;
        })}
      </div>
    </>
  );
}

export async function DirectoryPage({
  kind,
  searchParams,
}: {
  kind: CollectionKey | 'explore';
  searchParams: Promise<{
    locale?: string | string[];
    q?: string | string[];
    cursor?: string | string[];
    category?: string | string[];
    region?: string | string[];
    fromYear?: string | string[];
    toYear?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const locale: Locale = params.locale === 'en' ? 'en' : 'so';
  const keys: CollectionKey[] =
    kind === 'explore'
      ? ['countries', 'events', 'figures', 'timelines', 'civilizations', 'history']
      : [kind];
  const meta =
    kind === 'explore'
      ? { so: 'Sahami taariikhda', en: 'Explore history' }
      : collections[kind].title;
  const description =
    kind === 'explore'
      ? locale === 'so'
        ? 'Ka bilow goobta aad xiisaynayso: dalal, dhacdooyin, shakhsiyaad iyo ilbaxnimooyin.'
        : 'Choose where to begin: countries, events, people, and civilizations.'
      : descriptions[kind][locale];
  let unavailable = false;
  let nextCursor: string | null = null;
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const shortQuery = query.length === 1;
  const cursor = typeof params.cursor === 'string' ? params.cursor : '';
  const category = typeof params.category === 'string' ? params.category.trim() : '';
  const region = typeof params.region === 'string' ? params.region.trim() : '';
  const fromYear = typeof params.fromYear === 'string' ? params.fromYear.trim() : '';
  const toYear = typeof params.toYear === 'string' ? params.toYear.trim() : '';
  let records: PublicContent[] = [];
  if (kind === 'countries' && !shortQuery) {
    const path = new URLSearchParams({ locale, limit: '20' });
    if (query.length >= 2) path.set('q', query);
    if (cursor) path.set('cursor', cursor);
    if (region) path.set('region', region);
    const result = await apiGet<CollectionResponse<Country>>(
      `${query.length >= 2 ? 'countries/search' : 'countries'}?${path.toString()}`,
    );
    records = (result.data?.data ?? []).map((country) => ({ ...country }));
    nextCursor = result.data?.nextCursor ?? null;
    unavailable = result.unavailable;
  } else if (kind !== 'explore' && !shortQuery) {
    const config = collections[kind];
    const path = new URLSearchParams({ locale, limit: '20' });
    if (query.length >= 2) path.set('q', query);
    if (cursor) path.set('cursor', cursor);
    if (kind === 'events') {
      if (category) path.set('category', category);
      if (fromYear) path.set('fromYear', fromYear);
      if (toYear) path.set('toYear', toYear);
    }
    if (kind === 'civilizations' && region) path.set('region', region);
    const result = await apiGet<CollectionResponse<PublicContent>>(
      `${config.endpoint}?${path.toString()}`,
    );
    records = result.data?.data ?? [];
    nextCursor = result.data?.nextCursor ?? null;
    unavailable = result.unavailable;
  }
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap">
        <PageIntro
          eyebrow={locale === 'so' ? 'Kaydka WorldHeritage' : 'WorldHeritage archive'}
          title={meta[locale]}
          description={description}
        />
        {kind === 'explore' ? (
          <div className="collection-grid section">
            {keys.map((key, index) => (
              <Link
                className="collection-card"
                key={key}
                href={`/${collections[key].route}?locale=${locale}`}
              >
                <span className="card-index">0{index + 1} / 06</span>
                <h3>{collections[key].title[locale]}</h3>
                <p>{descriptions[key][locale]}</p>
              </Link>
            ))}
          </div>
        ) : kind === 'countries' ||
          kind === 'events' ||
          kind === 'figures' ||
          kind === 'timelines' ||
          kind === 'civilizations' ||
          kind === 'history' ? (
          <section className="section" aria-live="polite">
            <form
              className={`search-form filters-form filters-${kind}`}
              action={`/${collections[kind].route}`}
              role="search"
            >
              <label className="sr-only" htmlFor="country-filter">
                {locale === 'so'
                  ? 'Raadi diiwaannada'
                  : `Search ${collections[kind].title.en.toLowerCase()}`}
              </label>
              <input
                id="country-filter"
                type="search"
                name="q"
                minLength={2}
                maxLength={100}
                defaultValue={query}
                placeholder={
                  locale === 'so' ? 'Raadi magac ama dulmar…' : 'Search names or summaries…'
                }
              />
              <input type="hidden" name="locale" value={locale} />
              {kind === 'countries' && (
                <label className="filter-field">
                  <span>{locale === 'so' ? 'Gobol' : 'Region'}</span>
                  <input
                    name="region"
                    defaultValue={region}
                    maxLength={100}
                    placeholder={locale === 'so' ? 'Gobol' : 'Region'}
                  />
                </label>
              )}
              {kind === 'civilizations' && (
                <label className="filter-field">
                  <span>{locale === 'so' ? 'Gobol' : 'Region'}</span>
                  <input
                    name="region"
                    defaultValue={region}
                    maxLength={100}
                    placeholder={locale === 'so' ? 'Gobol' : 'Region'}
                  />
                </label>
              )}
              {kind === 'events' && (
                <>
                  <label className="filter-field">
                    <span>{locale === 'so' ? 'Qayb' : 'Category'}</span>
                    <input
                      name="category"
                      defaultValue={category}
                      maxLength={120}
                      placeholder={locale === 'so' ? 'Qaybta dhacdada' : 'Event category'}
                    />
                  </label>
                  <label className="filter-field">
                    <span>{locale === 'so' ? 'Laga bilaabo sannadka' : 'From year'}</span>
                    <input
                      name="fromYear"
                      type="number"
                      min="-999999"
                      max="999999"
                      defaultValue={fromYear}
                    />
                  </label>
                  <label className="filter-field">
                    <span>{locale === 'so' ? 'Ilaa sannadka' : 'To year'}</span>
                    <input
                      name="toYear"
                      type="number"
                      min="-999999"
                      max="999999"
                      defaultValue={toYear}
                    />
                  </label>
                </>
              )}
              <button type="submit">{locale === 'so' ? 'Raadi' : 'Search'} ↗</button>
            </form>
            {shortQuery ? (
              <p className="api-state-inline">
                {locale === 'so'
                  ? 'Raadintu ugu yaraan laba xaraf ayay u baahan tahay.'
                  : 'Search needs at least two characters.'}
              </p>
            ) : unavailable ? (
              <ApiState locale={locale} />
            ) : records.length ? (
              <>
                <div className="country-grid" style={{ marginTop: 22 }}>
                  {records.map((record) => (
                    <Link
                      className="country-card"
                      key={record.id}
                      href={`/${collections[kind].route}/${record.slug}?locale=${locale}`}
                    >
                      <span className="country-code">
                        {record.category ??
                          record.region ??
                          record.dateDisplay ??
                          record.authorName ??
                          '—'}
                      </span>
                      <h3>{record.title}</h3>
                      <p>{record.summary}</p>
                    </Link>
                  ))}
                </div>
                {nextCursor && (
                  <div style={{ marginTop: 24 }}>
                    <Link
                      className="text-link"
                      href={`/${collections[kind].route}?${new URLSearchParams({ locale, cursor: nextCursor, ...(query ? { q: query } : {}), ...(category ? { category } : {}), ...(region ? { region } : {}), ...(fromYear ? { fromYear } : {}), ...(toYear ? { toYear } : {}) }).toString()}`}
                    >
                      {locale === 'so' ? 'Dalal kale →' : 'Next countries →'}
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="api-state-inline">
                {query.length >= 2
                  ? locale === 'so'
                    ? 'Wax diiwaan ah lagama helin raadintan.'
                    : 'No records matched this search.'
                  : locale === 'so'
                    ? 'Weli ma jiraan diiwaanno la daabacay luqaddan.'
                    : 'No records have been published in this language yet.'}
              </p>
            )}
          </section>
        ) : (
          <ApiState locale={locale} unsupported />
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

export async function EntryPage({
  kind,
  slug,
  searchParams,
}: {
  kind: CollectionKey;
  slug: string;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale: Locale = params.locale === 'en' ? 'en' : 'so';
  if (kind === 'countries') {
    const result = await apiGet<import('@/lib/api').CountryDetail>(
      `countries/${encodeURIComponent(slug)}?locale=${locale}`,
    );
    const country = result.data;
    if (!country)
      return (
        <>
          <SiteHeader locale={locale} />
          <div className="country-detail">
            <Link className="text-link" href={`/countries?locale=${locale}`}>
              ← {collections.countries.title[locale]}
            </Link>
            <ApiState locale={locale} notFound={result.notFound} />
          </div>
          <SiteFooter locale={locale} />
        </>
      );
    return (
      <>
        <SiteHeader locale={locale} />
        <main className="country-detail">
          <Link className="text-link" href={`/countries?locale=${locale}`}>
            ← {collections.countries.title[locale]}
          </Link>
          <article className="section">
            <p className="eyebrow">{country.isoAlpha2 ?? country.slug}</p>
            <h1 lang={locale}>{country.title}</h1>
            <p className="summary" lang={locale}>
              {country.summary}
            </p>
            <div className="country-body" lang={locale}>
              {country.body}
            </div>
            {country.publishedAt && (
              <p className="eyebrow" style={{ marginTop: 24 }}>
                {locale === 'so' ? 'La daabacay' : 'Published'} ·{' '}
                <time dateTime={country.publishedAt}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                    new Date(country.publishedAt),
                  )}
                </time>
              </p>
            )}
          </article>
          <section className="sources">
            <h2>{locale === 'so' ? 'Ilaha iyo sheegashooyinka' : 'Sources & claims'}</h2>
            {country.sources.length ? (
              country.sources.map((entry, index) => (
                <article className="source-card" key={`${entry.source.title}-${index}`}>
                  <h3>
                    {entry.source.url ? (
                      <a href={entry.source.url} target="_blank" rel="noreferrer">
                        {entry.source.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      entry.source.title
                    )}
                  </h3>
                  <p>
                    {[
                      entry.source.creator,
                      entry.source.publisherOrCollection,
                      entry.source.publicationDateText,
                      entry.source.stableIdentifier,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p>
                    {entry.claimNote}{' '}
                    <span>({entry.claimStanding.toLowerCase().replaceAll('_', ' ')})</span>
                    {entry.locator && ` · ${entry.locator}`}
                  </p>
                </article>
              ))
            ) : (
              <p>—</p>
            )}
          </section>
        </main>
        <SiteFooter locale={locale} />
      </>
    );
  }
  const item = collections[kind];
  const result = await apiGet<PublicContent>(
    `${item.endpoint}/${encodeURIComponent(slug)}?locale=${locale}`,
  );
  const content = result.data;
  if (!content)
    return (
      <>
        <SiteHeader locale={locale} />
        <main className="page-wrap">
          <div className="page-intro">
            <Link className="text-link" href={`/${item.route}?locale=${locale}`}>
              ← {item.title[locale]}
            </Link>
          </div>
          <ApiState locale={locale} notFound={result.notFound} />
        </main>
        <SiteFooter locale={locale} />
      </>
    );

  const related = (
    label: string,
    entries: Array<Record<string, unknown>> | undefined,
    route: string,
  ) =>
    entries?.length ? (
      <section className="detail-related">
        <h2>{label}</h2>
        <ul>
          {entries.map((entry, index) => {
            const hrefSlug = typeof entry.slug === 'string' ? entry.slug : '';
            const title = typeof entry.title === 'string' ? entry.title : hrefSlug;
            const relation = typeof entry.relation === 'string' ? entry.relation : '';
            return (
              <li key={`${hrefSlug}-${index}`}>
                {hrefSlug ? (
                  <Link href={`/${route}/${encodeURIComponent(hrefSlug)}?locale=${locale}`}>
                    {title}
                  </Link>
                ) : (
                  title
                )}
                {relation && <span> · {relation.toLowerCase().replaceAll('_', ' ')}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap detail-page">
        <article>
          <div className="page-intro detail-intro">
            <Link className="text-link" href={`/${item.route}?locale=${locale}`}>
              ← {item.title[locale]}
            </Link>
            <p className="eyebrow" style={{ marginTop: 26 }}>
              {content.category ?? item.title[locale]}
            </p>
            <h1 lang={locale}>{content.title}</h1>
            <p className="intro-copy" lang={locale}>
              {content.summary}
            </p>
          </div>
          <div className="detail-metadata">
            {content.dateDisplay && (
              <span>
                {content.dateDisplay}
                {content.datePrecision &&
                  ` · ${content.datePrecision.toLowerCase().replaceAll('_', ' ')}`}
                {content.dateCertainty && ` · ${content.dateCertainty.toLowerCase()}`}
              </span>
            )}
            {content.startYear !== undefined && content.startYear !== null && (
              <span>
                {content.startYear}
                {content.endYear !== undefined &&
                content.endYear !== null &&
                content.endYear !== content.startYear
                  ? `–${content.endYear}`
                  : ''}
              </span>
            )}
            {content.birthDateText && (
              <span>
                {locale === 'so' ? 'Dhashay' : 'Born'}: {content.birthDateText}
              </span>
            )}
            {content.deathDateText && (
              <span>
                {locale === 'so' ? 'Geeriyooday' : 'Died'}: {content.deathDateText}
              </span>
            )}
            {content.region && <span>{content.region}</span>}
            {content.authorName && (
              <span>
                {locale === 'so' ? 'Qoraa' : 'By'}: {content.authorName}
              </span>
            )}
            {content.editorName && (
              <span>
                {locale === 'so' ? 'Tifaftire' : 'Editor'}: {content.editorName}
              </span>
            )}
            {content.publishedAt && (
              <span>
                {locale === 'so' ? 'La daabacay' : 'Published'}:{' '}
                <time dateTime={content.publishedAt}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                    new Date(content.publishedAt),
                  )}
                </time>
              </span>
            )}
            {content.updatedAt && (
              <span>
                {locale === 'so' ? 'La cusbooneysiiyay' : 'Updated'}:{' '}
                <time dateTime={content.updatedAt}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                    new Date(content.updatedAt),
                  )}
                </time>
              </span>
            )}
          </div>
          {content.body &&
            (kind === 'history' ? (
              <ArticleBody body={content.body} locale={locale} />
            ) : (
              <div className="country-body article-body" lang={locale}>
                {content.body}
              </div>
            ))}
          {related(
            locale === 'so' ? 'Dalalka la xiriira' : 'Related countries',
            content.countries,
            'countries',
          )}
          {related(
            locale === 'so' ? 'Dhacdooyinka la xiriira' : 'Related events',
            content.events,
            'events',
          )}
          {related(
            locale === 'so' ? 'Dadka la xiriira' : 'Related people',
            content.people,
            'figures',
          )}
          {content.sources?.length ? (
            <section className="sources">
              <h2>{locale === 'so' ? 'Ilaha iyo sheegashooyinka' : 'Sources and claims'}</h2>
              {content.sources.map((entry, index) => (
                <article className="source-card" key={`${entry.source.title}-${index}`}>
                  <h3>
                    {entry.source.url ? (
                      <a href={entry.source.url} target="_blank" rel="noreferrer">
                        {entry.source.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      entry.source.title
                    )}
                  </h3>
                  <p>
                    {[
                      entry.source.creator,
                      entry.source.publisherOrCollection,
                      entry.source.publicationDateText,
                      entry.source.stableIdentifier,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p>
                    {entry.claimNote}{' '}
                    <span>({entry.claimStanding.toLowerCase().replaceAll('_', ' ')})</span>
                    {entry.locator && ` · ${entry.locator}`}
                  </p>
                </article>
              ))}
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
