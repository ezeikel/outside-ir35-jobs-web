import type { MetadataRoute } from 'next';
import { getJobs, getSeoSkills } from '@/app/actions';
import { skillToSlug } from '@/lib/seo/skill-slug';

const SITE = 'https://www.outsideir35.jobs';

// Sitemap: static surfaces + every live (board-visible) job + the data-backed
// per-skill landing pages. Only pages that actually exist are listed — the skill
// pages are gated on MIN_SAMPLE, so we never advertise thin content.
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [jobs, skills] = await Promise.all([getJobs(), getSeoSkills()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/day-rates`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${SITE}/job/${job.id}`,
    lastModified: job.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const skillRoutes: MetadataRoute.Sitemap = skills.map((skill) => ({
    url: `${SITE}/contracts/${skillToSlug(skill)}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...jobRoutes, ...skillRoutes];
};

export default sitemap;
