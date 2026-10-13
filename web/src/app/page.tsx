'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Locale = 'so' | 'en';
type Country = {
  id: string;
  slug: string;
  isoAlpha2: string | null;
  title: string;
  summary: string;
};
type CountryResponse = { data: Country[] };

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1').replace(
  /\/$/,
  '',
);

const copy = {
  so: {
    about: 'Ku saabsan',
    principles: "Mabaadi'da",
    label: 'Taariikh wadaag ah. Caddayn muuqata.',
    title: 'Dunida ku baro sheekooyinkeeda.',
    intro: 'Sahami taariikhda adigoo raacaya ilaha, aragtiyada kala duwan iyo hubanti la’aanta.',
    search: 'Raadi dalalka la daabacay',
    placeholder: 'Tusaale: Soomaaliya',
    submit: 'Raadi',
    loading: 'Natiijooyinka waa la raadinayaa…',
    empty: 'Wax natiijo ah lagama helin luqaddan.',
    unavailable: 'Adeegga raadintu hadda lama heli karo. Fadlan mar kale isku day.',
    browse: 'Dalalka la daabacay',
    sources: 'Sheegashooyinka taariikhiga ah waxaa la socda ilo iyo dib-u-eegis tifaftireed.',
    principleTitle: 'Sida aan taariikhda u soo bandhigno',
    evidence: 'Caddayn la raaci karo',
    honest: 'Hubanti la’aan daacad ah',
    bilingual: 'Laba luqadood',
    evidenceText: 'Sheegashooyinka waxaa lagu xiriiriyaa ilo la hubin karo.',
    honestText: 'Fasiraadaha, doodaha iyo taariikhaha aan saxnayn waa la kala caddeeyaa.',
    bilingualText: 'Af-Soomaali iyo Ingiriisi si gaar ah ayaa loogu diyaariyaa loona eegaa.',
  },
  en: {
    about: 'About',
    principles: 'Principles',
    label: 'Shared history. Visible evidence.',
    title: 'Explore the stories that shape our world.',
    intro:
      'Explore history through its sources, differing interpretations, and clearly stated uncertainty.',
    search: 'Search published countries',
    placeholder: 'For example: Somalia',
    submit: 'Search',
    loading: 'Searching…',
    empty: 'No results were found in this language.',
    unavailable: 'Search is unavailable right now. Please try again.',
    browse: 'Published countries',
    sources: 'Historical claims are published with sources and editorial review.',
    principleTitle: 'How we present history',
    evidence: 'Traceable evidence',
    honest: 'Honest uncertainty',
    bilingual: 'Two languages',
    evidenceText: 'Claims are linked to sources readers can check.',
    honestText: 'Interpretations, debates, and imprecise dates are clearly distinguished.',
    bilingualText: 'Somali and English are authored and reviewed as distinct locales.',
  },
} as const;

export default function Home() {
  const [locale, setLocale] = useState<Locale>('so');
  const [term, setTerm] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('locale');
    if (requested === 'en' || requested === 'so') setLocale(requested);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/countries?locale=${locale}&limit=6`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Country list unavailable');
        return response.json() as Promise<CountryResponse>;
      })
      .then((result) => setCountries(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setCountries([]);
      });
    return () => controller.abort();
  }, [locale]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = term.trim();
    if (query.length < 2) return;
    setLoading(true);
    setSearched(true);
    setError(false);
    try {
      const response = await fetch(
        `${apiBase}/countries/search?q=${encodeURIComponent(query)}&locale=${locale}`,
      );
      if (!response.ok) throw new Error('Search failed');
      const result = (await response.json()) as CountryResponse;
      setCountries(result.data);
    } catch {
      setError(true);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }

  function resetBrowse() {
    setSearched(false);
    setTerm('');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between border-b border-stone-200 pb-5">
        <a
          className="text-lg font-semibold tracking-tight"
          href="#home"
          aria-label="WorldHeritage home"
        >
          <span className="text-amber-700">World</span>Heritage
        </a>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-5 text-sm text-stone-600"
        >
          <a href="#about" className="hover:text-stone-950">
            {t.about}
          </a>
          <a href="#principles" className="hover:text-stone-950">
            {t.principles}
          </a>
          <div className="flex rounded-full border border-stone-300 p-1" aria-label="Language">
            {(['so', 'en'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLocale(value);
                  setSearched(false);
                  setTerm('');
                }}
                lang={value}
                aria-pressed={locale === value}
                className={`min-h-8 rounded-full px-3 text-xs font-semibold uppercase focus-visible:outline-2 focus-visible:outline-amber-800 ${locale === value ? 'bg-stone-950 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <section
        id="home"
        className="grid flex-1 content-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-amber-800">
            {t.label}
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-stone-950 sm:text-7xl">
            {t.title}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">{t.intro}</p>
          <form onSubmit={search} className="mt-9 flex flex-col gap-3 sm:flex-row" role="search">
            <label className="sr-only" htmlFor="country-search">
              {t.search}
            </label>
            <input
              id="country-search"
              type="search"
              minLength={2}
              maxLength={100}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t.placeholder}
              className="min-h-12 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 text-sm outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-800/20"
            />
            <button
              type="submit"
              disabled={loading || term.trim().length < 2}
              className="min-h-12 rounded-full bg-stone-950 px-6 text-sm font-medium text-white transition hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.submit}
            </button>
          </form>
        </div>
        <aside
          id="about"
          className="flex flex-col justify-between rounded-3xl bg-[#eee8dc] p-8 sm:p-10"
          aria-label={t.about}
        >
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-600">
            {t.about}
          </p>
          <blockquote className="my-10 text-3xl leading-snug tracking-tight text-stone-900">
            {locale === 'so'
              ? '“Taariikh wanaagsan waxay kuu sheegtaa halka ay caddayntu ka timid.”'
              : '“Good history shows you where its evidence comes from.”'}
          </blockquote>
          <p className="border-t border-stone-400/50 pt-5 text-sm leading-6 text-stone-600">
            {t.sources}
          </p>
        </aside>
      </section>

      <section aria-live="polite" aria-busy={loading} className="border-t border-stone-200 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-amber-800">
              {searched ? t.search : t.browse}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {searched ? `“${term.trim()}”` : t.browse}
            </h2>
          </div>
          {searched && (
            <button
              type="button"
              onClick={resetBrowse}
              className="min-h-10 rounded-full px-4 text-sm text-stone-600 underline underline-offset-4 hover:text-stone-950"
            >
              {t.browse}
            </button>
          )}
        </div>
        {loading && <p className="text-sm text-stone-600">{t.loading}</p>}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
            {t.unavailable}
          </p>
        )}
        {!loading && !error && countries.length === 0 && searched && (
          <p className="text-sm text-stone-600">{t.empty}</p>
        )}
        {!loading && countries.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <a
                key={country.id}
                href={`/countries/${encodeURIComponent(country.slug)}?locale=${locale}`}
                className="group rounded-2xl border border-stone-200 p-6 transition hover:border-amber-800 hover:bg-amber-50/40 focus-visible:outline-2 focus-visible:outline-amber-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold group-hover:text-amber-900">
                    {country.title}
                  </h3>
                  {country.isoAlpha2 && (
                    <span className="text-xs uppercase tracking-wider text-stone-500">
                      {country.isoAlpha2}
                    </span>
                  )}
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                  {country.summary}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section
        id="principles"
        aria-labelledby="principles-heading"
        className="border-t border-stone-200 py-10"
      >
        <div className="mb-7">
          <p className="text-sm uppercase tracking-[0.16em] text-amber-800">{t.principles}</p>
          <h2 id="principles-heading" className="mt-2 text-2xl font-semibold tracking-tight">
            {t.principleTitle}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[t.evidence, t.honest, t.bilingual].map((title, index) => {
            const description = [t.evidenceText, t.honestText, t.bilingualText][index];
            return (
              <article key={title} className="rounded-2xl border border-stone-200 p-6">
                <p className="text-sm text-amber-800">0{index + 1}</p>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-stone-200 py-5 text-xs text-stone-500">
        <span>
          WorldHeritage · {locale === 'so' ? 'Aasaaska tifaftirka' : 'Editorial foundation'}
        </span>
        <span>
          {locale === 'so'
            ? 'Caddayn marka hore · Dib-u-eegis bini’aadan'
            : 'Evidence first · Human reviewed'}
        </span>
      </footer>
    </main>
  );
}
