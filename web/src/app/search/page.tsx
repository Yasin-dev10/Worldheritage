import Link from 'next/link';
import { apiGet, type Locale } from '@/lib/api';
import { ApiState, PageIntro, SiteFooter, SiteHeader } from '@/components/site';
import { pageMetadata } from '@/lib/metadata';

export const instant = false;
export const metadata = pageMetadata(
  'Search',
  '/search',
  'Search WorldHeritage historical records and published sources.',
);

type SearchHit = { id: string; slug: string; type: string; title: string; summary?: string };
type SearchResponse = { data: SearchHit[]; nextCursor?: string | null };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    locale?: string | string[];
    q?: string | string[];
    type?: string | string[];
    fromYear?: string | string[];
    toYear?: string | string[];
    cursor?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const locale: Locale = params.locale === 'en' ? 'en' : 'so';
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const type = typeof params.type === 'string' ? params.type : '';
  const fromYear = typeof params.fromYear === 'string' ? params.fromYear : '';
  const toYear = typeof params.toYear === 'string' ? params.toYear : '';
  const cursor = typeof params.cursor === 'string' ? params.cursor : '';
  const apiQuery = new URLSearchParams({ q: query, locale, limit: '20' });
  if (type && type !== 'all') apiQuery.set('type', type);
  if (fromYear) apiQuery.set('fromYear', fromYear);
  if (toYear) apiQuery.set('toYear', toYear);
  if (cursor) apiQuery.set('cursor', cursor);
  const result =
    query.length >= 2 ? await apiGet<SearchResponse>(`search?${apiQuery.toString()}`) : null;
  const typeNames: Record<string, string> = {
    countries: locale === 'so' ? 'Dal' : 'Country',
    events: locale === 'so' ? 'Dhacdo' : 'Event',
    figures: locale === 'so' ? 'Shakhsi' : 'Figure',
    civilizations: locale === 'so' ? 'Ilbaxnimo' : 'Civilization',
    history: locale === 'so' ? 'Maqaal' : 'Article',
    timelines: locale === 'so' ? 'Jadwal' : 'Timeline',
  };
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="page-wrap">
        <PageIntro
          eyebrow={locale === 'so' ? 'Raadinta kaydka' : 'Search the archive'}
          title={locale === 'so' ? 'Raadi taariikhda.' : 'Search history.'}
          description={
            locale === 'so'
              ? 'Raadinta guud waxay daboolaysaa dalalka, qoraallada, dhacdooyinka, dadka iyo ilbaxnimooyinka.'
              : 'Search across countries, articles, events, people, and civilizations.'
          }
        />
        <form className="search-form filters-form filters-search" action="/search" role="search">
          <label className="sr-only" htmlFor="query">
            {locale === 'so' ? 'Ereyga raadinta' : 'Search term'}
          </label>
          <input
            id="query"
            name="q"
            type="search"
            minLength={2}
            maxLength={100}
            defaultValue={query}
            placeholder={
              locale === 'so' ? 'Geli ugu yaraan laba xaraf' : 'Enter at least two characters'
            }
            required
          />
          <input type="hidden" name="locale" value={locale} />
          <label className="filter-field">
            <span>{locale === 'so' ? 'Qaybta' : 'Collection'}</span>
            <select name="type" defaultValue={type || 'all'}>
              <option value="all">{locale === 'so' ? 'Dhammaan' : 'All'}</option>
              <option value="countries">{locale === 'so' ? 'Dalal' : 'Countries'}</option>
              <option value="events">{locale === 'so' ? 'Dhacdooyin' : 'Events'}</option>
              <option value="figures">{locale === 'so' ? 'Shakhsiyaad' : 'People'}</option>
              <option value="civilizations">
                {locale === 'so' ? 'Ilbaxnimooyin' : 'Civilizations'}
              </option>
              <option value="history">{locale === 'so' ? 'Maqaallo' : 'Articles'}</option>
              <option value="timelines">{locale === 'so' ? 'Jadwallo' : 'Timelines'}</option>
            </select>
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
            <input name="toYear" type="number" min="-999999" max="999999" defaultValue={toYear} />
          </label>
          <button type="submit">{locale === 'so' ? 'Raadi' : 'Search'} ↗</button>
        </form>
        <section className="search-results" aria-live="polite">
          {query.length < 2 ? (
            <p className="api-state-inline">
              {locale === 'so'
                ? 'Geli ugu yaraan laba xaraf si aad u raadiso.'
                : 'Enter at least two characters to search.'}
            </p>
          ) : result?.unavailable ? (
            <ApiState locale={locale} />
          ) : result?.data?.data.length ? (
            result.data.data.map((hit) => (
              <Link
                className="search-result"
                key={hit.id}
                href={`/${hit.type}/${encodeURIComponent(hit.slug)}?locale=${locale}`}
              >
                <p className="eyebrow">{typeNames[hit.type] ?? hit.type}</p>
                <h2>{hit.title}</h2>
                <p>{hit.summary}</p>
              </Link>
            ))
          ) : (
            <p className="api-state-inline">
              {locale === 'so'
                ? 'Wax natiijo ah lagama helin raadintan.'
                : 'No results matched this search.'}
            </p>
          )}
          {result?.data?.nextCursor && (
            <p>
              <Link
                className="text-link"
                href={`/search?${new URLSearchParams({ q: query, locale, cursor: result.data.nextCursor, ...(type ? { type } : {}), ...(fromYear ? { fromYear } : {}), ...(toYear ? { toYear } : {}) }).toString()}`}
              >
                {locale === 'so' ? 'Natiijooyin dheeraad ah →' : 'More results →'}
              </Link>
            </p>
          )}
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
