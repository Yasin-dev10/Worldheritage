import { ResearchDraftDirectory } from '@/components/research-drafts';
import { localeFrom } from '@/lib/api';
import { pageMetadata } from '@/lib/metadata';

export const instant = false;
export const metadata = pageMetadata(
  'Somali research drafts',
  '/research',
  'Preliminary Somali history and culture records awaiting source review.',
);

export default async function Page(props: {
  searchParams: Promise<{ locale?: string | string[]; q?: string | string[] }>;
}) {
  const search = await props.searchParams;
  const locale = localeFrom(search.locale);
  const query = typeof search.q === 'string' ? search.q : '';
  return <ResearchDraftDirectory locale={locale} query={query} />;
}
