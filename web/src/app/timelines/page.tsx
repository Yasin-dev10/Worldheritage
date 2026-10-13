import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Timelines',
  '/timelines',
  'Follow historical events across time, including uncertain or approximate dates.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="timelines" searchParams={props.searchParams} />;
}
