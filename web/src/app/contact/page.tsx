import { PageIntro, SiteFooter, SiteHeader } from '@/components/site';
import type { Locale } from '@/lib/api';
import { pageMetadata } from '@/lib/metadata';
export const metadata = pageMetadata(
  'Contact',
  '/contact',
  'Contact WorldHeritage about the project, historical records, or sources.',
);
export const instant = false;
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const p = await searchParams;
  const l: Locale = p.locale === 'en' ? 'en' : 'so';
  return (
    <>
      <SiteHeader locale={l} />
      <main className="page-wrap">
        <PageIntro
          eyebrow={l === 'so' ? 'Nala soo xiriir' : 'Get in touch'}
          title={l === 'so' ? 'Xiriir' : 'Contact'}
          description={
            l === 'so'
              ? 'Su’aalo ku saabsan mashruuca, xogta ama ilaha? Nala soo xiriir.'
              : 'Questions about the project, records, or sources? Get in touch.'
          }
        />
        <section className="legal-copy">
          <p>
            {l === 'so'
              ? 'Kanaalka xiriirka dadweynaha weli lama daahfurin. Wixii xogta tifaftirka ah, eeg siyaasadda tifaftirka.'
              : 'A public contact channel has not launched yet. For information about our standards, see the editorial policy.'}
          </p>
          <p>
            <a className="text-link" href={`/editorial-policy?locale=${l}`}>
              {l === 'so' ? 'Akhri siyaasadda tifaftirka' : 'Read our editorial policy'} ↗
            </a>
          </p>
        </section>
      </main>
      <SiteFooter locale={l} />
    </>
  );
}
