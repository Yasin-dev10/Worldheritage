import Link from 'next/link';
import type { Locale } from '@/lib/api';

const nav = [
  { href: '/explore', so: 'Sahami', en: 'Explore' },
  { href: '/events', so: 'Dhacdooyin', en: 'Events' },
  { href: '/figures', so: 'Shakhsiyaad', en: 'People' },
  { href: '/history', so: 'Maqaallo', en: 'Stories' },
];

export function SiteHeader({ locale = 'so' }: { locale?: Locale }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href={`/?locale=${locale}`} aria-label="WorldHeritage home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            WORLD<span className="brand-light">HERITAGE</span>
          </span>
        </Link>
        <nav aria-label={locale === 'so' ? 'Hagidda guud' : 'Main navigation'} className="main-nav">
          {nav.map((item) => (
            <Link key={item.href} href={`${item.href}?locale=${locale}`}>
              {item[locale]}
            </Link>
          ))}
          <Link className="nav-explore" href={`/countries?locale=${locale}`}>
            {locale === 'so' ? 'Dalalka' : 'Countries'} <span aria-hidden="true">↗</span>
          </Link>
        </nav>
        <div className="locale-switch" aria-label="Language">
          <Link href="?locale=so" lang="so" aria-current={locale === 'so' ? 'page' : undefined}>
            SO
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="?locale=en" lang="en" aria-current={locale === 'en' ? 'page' : undefined}>
            EN
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale = 'so' }: { locale?: Locale }) {
  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" href={`/?locale=${locale}`}>
        <span className="brand-mark" aria-hidden="true">
          W
        </span>
        <span>
          WORLD<span className="brand-light">HERITAGE</span>
        </span>
      </Link>
      <p>
        {locale === 'so'
          ? 'Taariikh la baari karo, ilo la raaci karo.'
          : 'History to explore. Evidence to follow.'}
      </p>
      <nav aria-label={locale === 'so' ? 'Xiriirro kale' : 'Footer navigation'}>
        <Link href={`/about?locale=${locale}`}>{locale === 'so' ? 'Nagu saabsan' : 'About'}</Link>
        <Link href={`/editorial-policy?locale=${locale}`}>
          {locale === 'so' ? 'Siyaasadda tifaftirka' : 'Editorial policy'}
        </Link>
        <Link href={`/contact?locale=${locale}`}>{locale === 'so' ? 'Xiriir' : 'Contact'}</Link>
      </nav>
      <small>© WorldHeritage</small>
    </footer>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="intro-copy">{description}</p>
    </div>
  );
}

export function ApiState({
  locale,
  unsupported = false,
  notFound = false,
}: {
  locale: Locale;
  unsupported?: boolean;
  notFound?: boolean;
}) {
  return (
    <section className="api-state" role="status">
      <span className="state-icon" aria-hidden="true">
        ◌
      </span>
      <div>
        <h2>
          {locale === 'so'
            ? unsupported
              ? 'Xogtan weli lama daabicin'
              : notFound
                ? 'Diiwaankan lama helin'
                : 'Xogta hadda lama heli karo'
            : unsupported
              ? 'This collection has no published records yet'
              : notFound
                ? 'This record was not found'
                : 'Content is unavailable right now'}
        </h2>
        <p>
          {locale === 'so'
            ? unsupported
              ? 'Weli lama daabicin diiwaanno qaybtan ah. Diiwaannada la ansixiyo ayaa halkan ka muuqan doona.'
              : notFound
                ? 'Diiwaankan lama daabicin luqaddan ama ma jiro.'
                : 'Adeegga xogta hadda lama heli karo. Dib u tijaabi goor dambe.'
            : unsupported
              ? 'No records have been published in this section yet. Reviewed records will appear here when available.'
              : notFound
                ? 'This record is not published in this language or does not exist.'
                : 'The content service is currently unavailable. Please try again later.'}
        </p>
      </div>
    </section>
  );
}
