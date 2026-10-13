import { PageIntro, SiteFooter, SiteHeader } from '@/components/site';
import type { Locale } from '@/lib/api';
import { pageMetadata } from '@/lib/metadata';
export const metadata = pageMetadata(
  'Editorial policy',
  '/editorial-policy',
  'How WorldHeritage selects, presents, reviews, and corrects historical information.',
);
export const instant = false;
export default async function Policy({
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
          eyebrow={l === 'so' ? 'Heerarka' : 'Our standards'}
          title={l === 'so' ? 'Siyaasadda tifaftirka' : 'Editorial policy'}
          description={
            l === 'so'
              ? 'Sida aan u xulanno, u soo bandhigno una saxno xogta taariikhiga ah.'
              : 'How we select, present, and correct historical information.'
          }
        />
        <article className="legal-copy">
          <h2>{l === 'so' ? 'Ilaha iyo caddaynta' : 'Sources and evidence'}</h2>
          <p>
            {l === 'so'
              ? 'Sheegashooyinka taariikhiga ah ee muhiimka ah waxaa lala xiriiriyaa ilo la aqoonsan karo. Hal il keliya si toos ah ugama dhiganto xaqiiqo; akhristayaashu waa inay arkaan halka ay caddayntu ka timid.'
              : 'Significant historical claims are linked to identifiable sources. A single source is not automatically conclusive; readers should be able to see where evidence comes from.'}
          </p>
          <h2>{l === 'so' ? 'Fasiraad iyo hubanti la’aan' : 'Interpretation and uncertainty'}</h2>
          <p>
            {l === 'so'
              ? 'Waxaan kala caddeynaa xaqiiqooyinka la diiwaangeliyay, fasiraadaha aqoonyahannada, sheegashooyinka la isku hayo iyo xogta aan la hubin. Taariikhaha taariikhiga ah laguma qiyaaso saxnaan aan iluhu taageerin.'
              : 'We distinguish documented facts, scholarly interpretations, disputed claims, and uncertainty. Historical dates are not given false precision beyond what sources support.'}
          </p>
          <h2>{l === 'so' ? 'Dib-u-eegis iyo sixid' : 'Review and corrections'}</h2>
          <p>
            {l === 'so'
              ? 'Waxyaabaha madasha lagu daabaco waxay u baahan yihiin dib-u-eegis tifaftireed. Habka gudbinta iyo sixidda dadweynaha weli waa la dhisayaa.'
              : 'Content published on the platform requires editorial review. Public submission and correction workflows are still being developed.'}
          </p>
          <p>
            {l === 'so'
              ? 'Xuquuqda sawirrada, asal-raacooda iyo ruqsadahooda waa in la ilaaliyaa marka warbaahin lagu daro.'
              : 'Image rights, provenance, and licensing must be preserved when media is added.'}
          </p>
        </article>
      </main>
      <SiteFooter locale={l} />
    </>
  );
}
