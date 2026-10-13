import { EntryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `Historical figure: ${slug}`,
    `/figures/${encodeURIComponent(slug)}`,
    'Historical biography with relevant dates, events, and source references.',
  );
}
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { slug } = await props.params;
  return <EntryPage kind="figures" slug={slug} searchParams={props.searchParams} />;
}
