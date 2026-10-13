import { EntryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `History article: ${slug}`,
    `/history/${encodeURIComponent(slug)}`,
    'Historical article with editorial context, author, and source references.',
  );
}
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { slug } = await props.params;
  return <EntryPage kind="history" slug={slug} searchParams={props.searchParams} />;
}
