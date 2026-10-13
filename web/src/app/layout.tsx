import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'WorldHeritage — Stories that shaped our world',
    template: '%s | WorldHeritage',
  },
  description:
    'Explore world history through published records, traceable sources, and clearly stated uncertainty.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="so" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
