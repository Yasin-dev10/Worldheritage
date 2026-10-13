import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Historical events',
  '/events',
  'Browse historical events and their documented dates and sources.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="events" searchParams={props.searchParams} />;
}
