import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Historical figures',
  '/figures',
  'Explore the lives and work of historical figures through reviewed records.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="figures" searchParams={props.searchParams} />;
}
