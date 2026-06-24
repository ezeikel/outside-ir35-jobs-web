import { createClient } from '@sanity/client';
import type { PortableTextBlock } from './portable-text.js';

/**
 * Sanity clients for the blog worker. The worker WRITES posts (token) and reads
 * covered topics for dedup. The web app reads posts separately (its own client).
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-02-19';

if (!projectId) {
  console.warn(
    '[sanity] NEXT_PUBLIC_SANITY_PROJECT_ID not set — blog writes will fail',
  );
}

export const sanityConfigured = Boolean(
  projectId && process.env.SANITY_API_TOKEN,
);

const writeClient = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// Topics already covered (one per published post) — drives dedup.
const COVERED_TOPICS_QUERY =
  '*[_type == "post" && defined(generationMeta.topic)].generationMeta.topic';
const TOPIC_EXISTS_QUERY =
  'count(*[_type == "post" && generationMeta.topic == $topic]) > 0';

export const getCoveredTopics = async (): Promise<string[]> => {
  try {
    return (await writeClient.fetch<string[]>(COVERED_TOPICS_QUERY)) || [];
  } catch (err) {
    console.error('[sanity] getCoveredTopics failed:', err);
    return [];
  }
};

export const isTopicCovered = async (topic: string): Promise<boolean> => {
  try {
    return Boolean(await writeClient.fetch(TOPIC_EXISTS_QUERY, { topic }));
  } catch {
    return false;
  }
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

/**
 * Find an author by slug or create it. The blog has one or two AI personas; we
 * keep them as real Sanity author docs so the web app can render bio/byline.
 */
export const lookupOrCreateAuthor = async (author: {
  name: string;
  title: string;
  bio: string;
}): Promise<string> => {
  const slug = slugify(author.name);
  const existing = await writeClient.fetch<string | null>(
    '*[_type == "author" && slug.current == $slug][0]._id',
    { slug },
  );
  if (existing) return existing;
  const created = await writeClient.create({
    _type: 'author',
    name: author.name,
    slug: { _type: 'slug', current: slug },
    title: author.title,
    bio: author.bio,
  });
  return created._id;
};

export type CreatePostInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: PortableTextBlock[];
  authorId: string;
  publishedAt: string; // ISO
  seo: { metaTitle: string; metaDescription: string; keywords: string[] };
  generationMeta: {
    topic: string;
    generatedAt: string;
    model: string;
    sourcesCheckedAt: string | null;
    dataBacked: boolean;
  };
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const doc = await writeClient.create({
    _type: 'post',
    title: input.title,
    slug: { _type: 'slug', current: input.slug },
    excerpt: input.excerpt,
    body: input.body,
    author: { _type: 'reference', _ref: input.authorId },
    publishedAt: input.publishedAt,
    status: 'published',
    seo: {
      metaTitle: input.seo.metaTitle,
      metaDescription: input.seo.metaDescription,
      keywords: input.seo.keywords,
    },
    generationMeta: input.generationMeta,
  });
  return doc._id;
};
