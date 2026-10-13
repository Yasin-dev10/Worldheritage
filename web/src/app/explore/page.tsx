import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Explore history',
  '/explore',
  'Explore countries, events, historical figures, timelines, civilizations, and articles.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="explore" searchParams={props.searchParams} />;
}
