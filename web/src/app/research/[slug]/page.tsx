import { ResearchDraftEntry } from '@/components/research-drafts';
import { localeFrom } from '@/lib/api';
import { pageMetadata } from '@/lib/metadata';

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `Somali research draft: ${slug}`,
    `/research/${encodeURIComponent(slug)}`,
    'Preliminary historical content. Sources and claims are awaiting editorial review.',
  );
}

export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const [{ slug }, search] = await Promise.all([props.params, props.searchParams]);
  return <ResearchDraftEntry slug={slug} locale={localeFrom(search.locale)} />;
}
