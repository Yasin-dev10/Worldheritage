import { DirectoryPage } from '@/components/content-pages';
import { pageMetadata } from '@/lib/metadata';
export const instant = false;
export const metadata = pageMetadata(
  'Civilizations',
  '/civilizations',
  'Explore published histories of civilizations and empires.',
);
export default function Page(props: { searchParams: Promise<{ locale?: string | string[] }> }) {
  return <DirectoryPage kind="civilizations" searchParams={props.searchParams} />;
}
