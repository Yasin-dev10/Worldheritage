import type { Metadata } from 'next';

export function pageMetadata(title: string, path: string, description: string): Metadata {
  return { title, description, alternates: { canonical: path } };
}
