import type { MetadataRoute } from 'next';

const SITE = 'https://www.outsideir35jobs.com';

// Allow crawling of public pages; keep authed/poster/API surfaces out of the index.
const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/api/',
      '/dashboard',
      '/profile',
      '/alerts',
      '/premium',
      '/onboarding',
    ],
  },
  sitemap: `${SITE}/sitemap.xml`,
  host: SITE,
});

export default robots;
