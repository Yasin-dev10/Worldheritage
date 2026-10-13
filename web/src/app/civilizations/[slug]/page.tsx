import { EntryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `Civilization: ${slug}`,
    `/civilizations/${encodeURIComponent(slug)}`,
    'Civilization history with periods, regions, people, events, and sources.',
  );
}
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { slug } = await props.params;
  return <EntryPage kind="civilizations" slug={slug} searchParams={props.searchParams} />;
}
