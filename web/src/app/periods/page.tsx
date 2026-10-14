import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Historical periods',
  '/periods',
  'Explore researched historical periods with uncertain dates and traceable sources.',
);
export default function Page(props: {
  searchParams: Promise<{ locale?: string | string[]; q?: string | string[]; cursor?: string }>;
}) {
  return <DirectoryPage kind="periods" searchParams={props.searchParams} />;
}
