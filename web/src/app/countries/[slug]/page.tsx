import { EntryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(
    `Country history: ${slug}`,
    `/countries/${encodeURIComponent(slug)}`,
    'Published country history with source references and editorial context.',
  );
}
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  const { slug } = await props.params;
  return <EntryPage kind="countries" slug={slug} searchParams={props.searchParams} />;
}
