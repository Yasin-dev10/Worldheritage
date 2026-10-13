import { PageIntro, SiteFooter, SiteHeader } from '@/components/site';
import type { Locale } from '@/lib/api';
import { pageMetadata } from '@/lib/metadata';
export const metadata = pageMetadata(
  'About',
  '/about',
  'About WorldHeritage and our approach to historical knowledge.',
);
export const instant = false;
export default async function About({
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
          eyebrow="WorldHeritage"
          title={
            l === 'so'
              ? 'Taariikh wadaag ah, caddayn muuqata.'
              : 'Shared history. Visible evidence.'
          }
          description={
            l === 'so'
              ? 'WorldHeritage waa madal aqoon taariikheed iyo dhaxal dijitaal ah. Waxaan u dhiseynaa si akhristayaashu u baari karaan halka xogtu ka timid.'
              : 'WorldHeritage is a historical knowledge and digital heritage platform. We make it possible for readers to trace where information comes from.'
          }
        />
        <section className="legal-copy">
          <h2>{l === 'so' ? 'Ujeeddadeenna' : 'Our purpose'}</h2>
          <p>
            {l === 'so'
              ? 'Waxaan isku xireynaa sheekooyinka taariikhda, ilo la baari karo iyo macne tifaftireed si aqoonta dhaxalka loo helo loona fahmo.'
              : 'We connect historical stories with inspectable sources and editorial context so that heritage knowledge is easier to find and understand.'}
          </p>
          <h2>{l === 'so' ? 'Mabaadi’deenna' : 'Our principles'}</h2>
          <p>
            {l === 'so'
              ? 'Sheegashooyinka muhiimka ah waa inay muujiyaan ilahooda. Fasiraadda iyo doodda taariikhiga ah waa in laga soocaa xaqiiqooyinka la diiwaangeliyay; taariikhaha aan la hubinna waa in si daacad ah loo tilmaamaa.'
              : 'Significant claims should show their sources. Historical interpretation and debate should be distinguished from documented facts, and uncertain dates should be identified honestly.'}
          </p>
          <p>
            {l === 'so'
              ? 'Af-Soomaaliga iyo Ingiriisiga si gaar ah ayaa loo qoraa oo loo eegaa; turjumaaddu ma aha beddelka dib-u-eegista.'
              : 'Somali and English are authored and reviewed as distinct locales; translation does not replace editorial review.'}
          </p>
        </section>
      </main>
      <SiteFooter locale={l} />
    </>
  );
}
