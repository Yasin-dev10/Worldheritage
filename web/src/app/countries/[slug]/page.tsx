import Link from 'next/link';

export const instant = false;

type Country = {
  id: string;
  slug: string;
  isoAlpha2: string | null;
  revisionId: string;
  publishedAt: string | null;
  locale: 'so' | 'en';
  title: string;
  summary: string;
  body: string;
  sources: Array<{
    locale: string | null;
    locator: string | null;
    claimNote: string;
    claimStanding: string;
    source: {
      sourceKind: string;
      creator: string | null;
      title: string;
      publisherOrCollection: string | null;
      publicationDateText: string | null;
      stableIdentifier: string | null;
      url: string | null;
      rightsStatus: string;
      rightsNotes: string | null;
    };
  }>;
};

const apiBase = (
  process.env.API_URL ??
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4001/api/v1'
).replace(/\/$/, '');

export default async function CountryPage({
  params,
  searchParams,
}: PageProps<'/countries/[slug]'>) {
  const { slug } = await params;
  const { locale: requestedLocale } = await searchParams;
  const locale = requestedLocale === 'en' ? 'en' : 'so';
  let country: Country | null = null;
  try {
    const response = await fetch(
      `${apiBase}/countries/${encodeURIComponent(slug)}?locale=${locale}`,
      { cache: 'no-store' },
    );
    if (response.ok) country = (await response.json()) as Country;
  } catch {
    // The page below gives readers a clear unavailable message if the API is offline.
  }

  if (!country) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-10">
        <Link
          className="text-sm text-amber-900 underline underline-offset-4"
          href={`/?locale=${locale}`}
        >
          {locale === 'so' ? 'Ku noqo raadinta' : 'Back to discovery'}
        </Link>
        <h1 className="mt-12 text-3xl font-semibold">
          {locale === 'so' ? 'Boggan lama heli karo' : 'This page is unavailable'}
        </h1>
        <p className="mt-4 text-stone-600">
          {locale === 'so'
            ? 'Waxaa laga yaabaa inaan dalka lagu daabicin luqaddan.'
            : 'This country may not have published content in this language yet.'}
        </p>
      </main>
    );
  }

  const labels =
    locale === 'so'
      ? {
          back: 'Ku noqo dalalka',
          sources: 'Ilaha',
          claim: 'Xiriirka sheegashada',
          locator: 'Goobta tixraaca',
          by: 'Waxaa qoray',
          published: 'La daabacay',
        }
      : {
          back: 'Back to countries',
          sources: 'Sources',
          claim: 'Claim connection',
          locator: 'Locator',
          by: 'By',
          published: 'Published',
        };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between border-b border-stone-200 pb-5">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          <span className="text-amber-700">World</span>Heritage
        </Link>
        <Link
          className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-950"
          href={`/?locale=${locale}`}
        >
          {labels.back}
        </Link>
      </header>
      <article className="py-12">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-amber-800" lang={locale}>
          {country.isoAlpha2 ?? country.slug}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl" lang={locale}>
          {country.title}
        </h1>
        <p className="mt-6 text-xl leading-8 text-stone-600" lang={locale}>
          {country.summary}
        </p>
        <div
          className="prose prose-stone mt-10 max-w-none whitespace-pre-wrap leading-8"
          lang={locale}
        >
          {country.body}
        </div>
        {country.publishedAt && (
          <p className="mt-8 text-xs text-stone-500">
            {labels.published}:{' '}
            <time dateTime={country.publishedAt}>
              {new Intl.DateTimeFormat(locale === 'so' ? 'so' : 'en', {
                dateStyle: 'long',
                timeZone: 'UTC',
              }).format(new Date(country.publishedAt))}
            </time>
          </p>
        )}
      </article>
      <section aria-labelledby="sources-heading" className="border-t border-stone-200 py-8">
        <h2 id="sources-heading" className="text-2xl font-semibold">
          {labels.sources}
        </h2>
        {country.sources.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">—</p>
        ) : (
          <ol className="mt-5 space-y-4">
            {country.sources.map((entry, index) => (
              <li
                key={`${entry.source.title}-${index}`}
                className="rounded-2xl border border-stone-200 p-5"
              >
                <h3 className="font-semibold">
                  {entry.source.url ? (
                    <a
                      className="underline decoration-amber-700 underline-offset-4"
                      href={entry.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {entry.source.title}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    entry.source.title
                  )}
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  {[
                    entry.source.creator && `${labels.by} ${entry.source.creator}`,
                    entry.source.publisherOrCollection,
                    entry.source.publicationDateText,
                    entry.source.stableIdentifier,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-3 text-sm leading-6">
                  {labels.claim}: {entry.claimNote}{' '}
                  <span className="text-stone-500">
                    ({entry.claimStanding.toLowerCase().replaceAll('_', ' ')})
                  </span>
                </p>
                {entry.locator && (
                  <p className="mt-1 text-sm text-stone-600">
                    {labels.locator}: {entry.locator}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
