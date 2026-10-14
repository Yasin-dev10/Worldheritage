import Link from 'next/link';
import { apiGet, collections, localeFrom, type CollectionResponse, type Country } from '@/lib/api';
import { SiteFooter, SiteHeader } from '@/components/site';
import { pageMetadata } from '@/lib/metadata';

export const instant = false;
export const metadata = pageMetadata(
  'Discover the stories that shaped our world',
  '/',
  'Explore world history through published records, traceable sources, and clearly stated uncertainty.',
);

export default async function Home({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  const locale = localeFrom(params.locale);
  const result = await apiGet<CollectionResponse<Country>>(`countries?locale=${locale}&limit=6`);
  const sections = Object.entries(collections).filter(([key]) => key !== 'countries');
  return (
    <>
      <SiteHeader locale={locale} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              {locale === 'so' ? 'DIIWAANKA DHAXALKA DUNIDA' : 'A LIVING RECORD OF OUR PAST'}
            </p>
            <h1>
              {locale === 'so'
                ? 'Sheekooyinka dunida, si qoto dheer u ogow.'
                : 'Discover the stories that shaped our world.'}
            </h1>
            <p>
              {locale === 'so'
                ? 'Sahami dalalka, dhacdooyinka iyo dadka taariikhda sameeyay. Raad raac ilaha, aragtiyada iyo su’aalaha weli taagan.'
                : 'Explore countries, events, and the people who shaped history. Follow the sources, interpretations, and questions that remain.'}
            </p>
            <form className="search-form" action="/search" role="search">
              <label className="sr-only" htmlFor="site-search">
                {locale === 'so' ? 'Raadi taariikhda' : 'Search history'}
              </label>
              <input
                id="site-search"
                type="search"
                name="q"
                minLength={2}
                maxLength={100}
                placeholder={
                  locale === 'so'
                    ? 'Raadi dal, qof ama dhacdo…'
                    : 'Search a country, person, or event…'
                }
                required
              />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit">
                {locale === 'so' ? 'Raadi' : 'Search'} <span aria-hidden="true">↗</span>
              </button>
            </form>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="artifact-orbit">
              <div className="artifact-center">W</div>
              <span className="artifact-label">
                {locale === 'so' ? 'Dhaxal la wadaago' : 'A shared inheritance'}
              </span>
            </div>
          </div>
        </section>
        <div className="page-wrap">
          <section className="section" aria-labelledby="explore-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">{locale === 'so' ? 'Sahami' : 'Explore'}</p>
                <h2 id="explore-title">
                  {locale === 'so'
                    ? 'Taariikhdu dhinacyo badan bay leedahay.'
                    : 'History has many doorways.'}
                </h2>
              </div>
              <Link className="text-link" href={`/explore?locale=${locale}`}>
                {locale === 'so' ? 'Eeg dhammaan qaybaha' : 'View all collections'} ↗
              </Link>
            </div>
            <div className="collection-grid">
              {sections.map(([key, item], index) => (
                <Link
                  className="collection-card"
                  key={key}
                  href={`/${item.route}?locale=${locale}`}
                >
                  <span className="card-index">
                    0{index + 1} / 0{sections.length}
                  </span>
                  <h3>{item.title[locale]}</h3>
                  <p>
                    {locale === 'so'
                      ? 'Baadh diiwaanno taariikheed iyo ilaha lagu saleeyay.'
                      : 'Explore historical records and the sources behind them.'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="section" aria-labelledby="countries-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">{locale === 'so' ? 'Goobaha' : 'Places'}</p>
                <h2 id="countries-title">
                  {locale === 'so' ? 'Dalalka la daabacay' : 'Published countries'}
                </h2>
              </div>
              <Link className="text-link" href={`/countries?locale=${locale}`}>
                {locale === 'so' ? 'Sahami dalalka' : 'Explore countries'} ↗
              </Link>
            </div>
            {result.unavailable ? (
              <p className="api-state-inline" role="status">
                {locale === 'so'
                  ? 'Xogta dalalka hadda lama heli karo. Hubi in API-gu shaqaynayo.'
                  : 'Country data is unavailable. Check that the API is running.'}
              </p>
            ) : result.data?.data.length ? (
              <div className="country-grid">
                {result.data.data.map((country) => (
                  <Link
                    className="country-card"
                    key={country.id}
                    href={`/countries/${country.slug}?locale=${locale}`}
                  >
                    <span className="country-code">{country.isoAlpha2 ?? '—'}</span>
                    <h3>{country.title}</h3>
                    <p>{country.summary}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="api-state-inline">
                {locale === 'so'
                  ? 'Weli ma jiraan dalal afkan lagu daabacay.'
                  : 'No countries have been published in this language yet.'}
              </p>
            )}
          </section>
          <section className="section" aria-labelledby="museum-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">
                  {locale === 'so' ? 'Matxafka dijitaalka ah' : 'Digital museum'}
                </p>
                <h2 id="museum-title">
                  {locale === 'so'
                    ? 'Dhaxalka oo la ilaaliyo, lana wadaago.'
                    : 'Preserving heritage, sharing knowledge.'}
                </h2>
              </div>
              <Link className="text-link" href={`/museum/items?locale=${locale}`}>
                {locale === 'so' ? 'Gal matxafka dijitaalka ah' : 'Visit the digital museum'} ↗
              </Link>
            </div>
            <p className="intro-copy">
              {locale === 'so'
                ? 'Waxaan dhiseynaa meel ay sheekooyinka taariikhdu ku yimaadaan iyagoo wata tixraacyo, macnaha guud iyo aqoonsiga hubanti la’aanta.'
                : 'We are building a place for history told with references, context, and an honest account of uncertainty.'}
            </p>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
