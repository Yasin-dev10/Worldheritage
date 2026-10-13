import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Countries',
  '/countries',
  'Browse and search published country histories with source references.',
);
export default function Page(props: {
  searchParams: Promise<{
    locale?: string | string[];
    q?: string | string[];
    cursor?: string | string[];
  }>;
}) {
  return <DirectoryPage kind="countries" searchParams={props.searchParams} />;
}
