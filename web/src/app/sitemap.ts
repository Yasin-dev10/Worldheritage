import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.SITE_URL ?? 'http://localhost:3000';
  const routes = [
    '',
    '/explore',
    '/countries',
    '/events',
    '/figures',
    '/timelines',
    '/civilizations',
    '/history',
    '/search',
    '/about',
    '/editorial-policy',
    '/contact',
  ];
  return routes.map((route) => ({
    url: new URL(route, origin).toString(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.6,
  }));
}
