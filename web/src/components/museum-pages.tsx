import Link from 'next/link';
import { apiGet, type CollectionResponse, type Locale } from '@/lib/api';
import { ApiState, PageIntro, SiteFooter, SiteHeader } from '@/components/site';

type MuseumItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  dateDisplay: string | null;
  datePrecision: string;
  currentLocation: string | null;
  creatorAttribution: string | null;
  provenance?: string | null;
  rightsNotes?: string | null;
  mediaAsset?: {
    storageLocation: string;
    mediaType: string;
    altText: string | null;
    attribution: string | null;
    license: string | null;
  } | null;
  items?: MuseumItem[];
  topic?: string | null;
  sources?: Array<{
    locator: string | null;
    claimNote: string;
    claimStanding: string;
    source: {
      title: string;
      creator: string | null;
      publisherOrCollection: string | null;
      publicationDateText: string | null;
      stableIdentifier: string | null;
      url: string | null;
    };
  }>;
};

function localeOf(params: { locale?: string | string[] }): Locale {
  return params.locale === 'en' ? 'en' : 'so';
}

function safeMediaUrl(value: string): string | null {
  if (value.startsWith('/') && !value.startsWith('//') && !value.split('/').includes('..'))
    return value;
  try {
    const url = new URL(value);
    const allowedOrigins = (process.env.NEXT_PUBLIC_MEDIA_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    return url.protocol === 'https:' && allowedOrigins.includes(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function MuseumDirectory({
  searchParams,
  kind,
}: {
  searchParams: Promise<{ locale?: string | string[]; q?: string | string[] }>;
  kind: 'items' | 'exhibitions' | 'maps';
}) {
  const params = await searchParams;
  const locale = localeOf(params);
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const endpoint =
    kind === 'items' ? 'museum/items' : kind === 'exhibitions' ? 'museum/exhibitions' : 'maps';
  const result = await apiGet<CollectionResponse<MuseumItem>>(
    `${endpoint}?locale=${locale}&limit=30${query.length >= 2 ? `&q=${encodeURIComponent(query)}` : ''}`,
  );
  const title =
    kind === 'items'
      ? locale === 'so'
        ? 'Matxafka dijitaalka ah'
        : 'Digital museum'
      : kind === 'exhibitions'
        ? locale === 'so'
          ? 'Bandhigyada'
          : 'Exhibitions'
        : locale === 'so'
          ? 'Khariidadaha taariikhiga ah'
          : 'Historical maps';
  const records = result.data?.data ?? [];
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap">
        <PageIntro
          eyebrow={locale === 'so' ? 'Kaydka dhaxalka' : 'Heritage collection'}
          title={title}
          description={
            locale === 'so'
              ? 'Sahami agab iyo khariidado wata xogta taariikhda, halka laga helay iyo xuquuqda isticmaalka.'
              : 'Explore historical objects and maps with date, provenance, collection, and rights information.'
          }
        />
        <form className="filters-form" role="search">
          <label className="sr-only" htmlFor="museum-search">
            {locale === 'so' ? 'Ka raadi ururinta' : 'Search the collection'}
          </label>
          <input
            id="museum-search"
            type="search"
            name="q"
            minLength={2}
            maxLength={100}
            defaultValue={query}
            placeholder={locale === 'so' ? 'Raadi ururinta…' : 'Search the collection…'}
          />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit">{locale === 'so' ? 'Raadi' : 'Search'}</button>
        </form>
        {result.unavailable ? (
          <ApiState locale={locale} />
        ) : records.length ? (
          <div className="country-grid section">
            {records.map((record) => (
              <Link
                className="country-card"
                key={record.id}
                href={`/${kind === 'items' ? 'museum/items' : kind === 'exhibitions' ? 'museum/exhibitions' : 'maps'}/${encodeURIComponent(record.slug)}?locale=${locale}`}
              >
                {record.mediaAsset &&
                  record.mediaAsset.mediaType.startsWith('image/') &&
                  safeMediaUrl(record.mediaAsset.storageLocation) && (
                    <img
                      className="museum-image"
                      src={safeMediaUrl(record.mediaAsset.storageLocation)!}
                      alt={record.mediaAsset.altText ?? record.title}
                      loading="lazy"
                    />
                  )}
                <span className="country-code">{record.dateDisplay ?? record.topic ?? '—'}</span>
                <h3>{record.title}</h3>
                <p>{record.description}</p>
                {record.currentLocation && <small>{record.currentLocation}</small>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="api-state-inline">
            {locale === 'so'
              ? 'Weli ma jiraan diiwaanno la daabacay.'
              : 'No records have been published yet.'}
          </p>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

export async function MuseumDetail({
  params,
  searchParams,
  kind,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
  kind: 'items' | 'exhibitions' | 'maps';
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const locale = localeOf(search);
  const endpoint =
    kind === 'items' ? 'museum/items' : kind === 'exhibitions' ? 'museum/exhibitions' : 'maps';
  const result = await apiGet<MuseumItem>(
    `${endpoint}/${encodeURIComponent(slug)}?locale=${locale}`,
  );
  const record = result.data;
  const back =
    kind === 'items' ? '/museum/items' : kind === 'exhibitions' ? '/museum/exhibitions' : '/maps';
  const mediaSrc = record?.mediaAsset ? safeMediaUrl(record.mediaAsset.storageLocation) : null;
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap detail-page">
        <Link className="text-link" href={`${back}?locale=${locale}`}>
          ← {locale === 'so' ? 'Ururinta' : 'Collection'}
        </Link>
        {!record ? (
          <ApiState locale={locale} notFound={result.notFound} />
        ) : (
          <article className="section">
            <p className="eyebrow">
              {record.dateDisplay ??
                record.topic ??
                (locale === 'so' ? 'Diiwaanka madxafka' : 'Museum record')}
            </p>
            <h1>{record.title}</h1>
            <p className="summary">{record.description}</p>
            {record.mediaAsset && (
              <figure className="museum-figure">
                {mediaSrc && record.mediaAsset.mediaType.startsWith('image/') ? (
                  <img src={mediaSrc} alt={record.mediaAsset.altText ?? record.title} />
                ) : mediaSrc && record.mediaAsset.mediaType === 'application/pdf' ? (
                  <a className="text-link" href={mediaSrc} target="_blank" rel="noreferrer">
                    {locale === 'so' ? 'Fur dukumentiga PDF' : 'Open PDF document'}{' '}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <p>
                    {locale === 'so'
                      ? 'Hor-u-eegista warbaahinta lama heli karo.'
                      : 'Media preview is unavailable.'}
                  </p>
                )}
                <figcaption>
                  {[record.mediaAsset.attribution, record.mediaAsset.license]
                    .filter(Boolean)
                    .join(' · ')}
                </figcaption>
              </figure>
            )}
            <div className="detail-metadata">
              {record.dateDisplay && (
                <span>
                  {record.dateDisplay} · {record.datePrecision.toLowerCase().replaceAll('_', ' ')}
                </span>
              )}
              {record.creatorAttribution && (
                <span>
                  {locale === 'so' ? 'Abuuraha' : 'Creator'}: {record.creatorAttribution}
                </span>
              )}
              {record.currentLocation && (
                <span>
                  {locale === 'so' ? 'Goobta ururinta' : 'Collection'}: {record.currentLocation}
                </span>
              )}
              {record.provenance && (
                <span>
                  {locale === 'so' ? 'Asalka' : 'Provenance'}: {record.provenance}
                </span>
              )}
            </div>
            {record.rightsNotes && (
              <p>
                {locale === 'so' ? 'Xuquuqda' : 'Rights'}: {record.rightsNotes}
              </p>
            )}
            {record.sources?.length ? (
              <section className="sources">
                <h2>{locale === 'so' ? 'Ilaha iyo sheegashooyinka' : 'Sources and claims'}</h2>
                {record.sources.map((entry, index) => (
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
            {record.items?.length ? (
              <section className="section">
                <h2>{locale === 'so' ? 'Agabka bandhigga' : 'Exhibition items'}</h2>
                <ul>
                  {record.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/museum/items/${encodeURIComponent(item.slug)}?locale=${locale}`}
                      >
                        {item.title}
                      </Link>{' '}
                      — {item.description}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
