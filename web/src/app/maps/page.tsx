import { MuseumDirectory } from '@/components/museum-pages';
export const instant = false;
export default function Page(props: {
  searchParams: Promise<{ locale?: string | string[]; q?: string | string[] }>;
}) {
  return <MuseumDirectory {...props} kind="maps" />;
}
