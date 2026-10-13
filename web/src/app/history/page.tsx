import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'History & articles',
  '/history',
  'Read reviewed history articles with references and publication details.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="history" searchParams={props.searchParams} />;
}
