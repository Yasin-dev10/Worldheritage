import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorldHeritage — Taariikh iyo hidde dijitaal ah',
  description:
    "Sahaminta taariikhda dunida, iyadoo caddaynta, tixraacyada iyo hubanti la'aanta si cad loo muujiyo.",
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="so" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
