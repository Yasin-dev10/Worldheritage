import { EntryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `Historical event: ${slug}`,
    `/events/${encodeURIComponent(slug)}`,
    'Historical event record with dates, relationships, and sources.',
  );
}
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { slug } = await props.params;
  return <EntryPage kind="events" slug={slug} searchParams={props.searchParams} />;
}
