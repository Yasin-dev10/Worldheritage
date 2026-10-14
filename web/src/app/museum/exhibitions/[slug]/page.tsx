import { MuseumDetail } from '@/components/museum-pages';
export const instant = false;
export default function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  return <MuseumDetail {...props} kind="exhibitions" />;
}
