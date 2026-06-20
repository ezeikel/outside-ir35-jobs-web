import type { TypedObject } from '@portabletext/types';
import { sanityClient, sanityConfigured } from './client';

export type BlogPostListItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  authorName: string | null;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  // Portable text blocks — rendered by @portabletext/react.
  body: TypedObject[];
  publishedAt: string;
  author: { name: string; title: string | null; bio: string | null } | null;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    keywords: string[] | null;
  } | null;
  generationMeta: {
    sourcesCheckedAt: string | null;
    dataBacked: boolean;
  } | null;
};

const POSTS_QUERY = `*[_type == "post" && status == "published"] | order(publishedAt desc) {
  _id, title, "slug": slug.current, excerpt, publishedAt,
  "authorName": author->name
}`;

const POST_BY_SLUG_QUERY = `*[_type == "post" && status == "published" && slug.current == $slug][0] {
  _id, title, "slug": slug.current, excerpt, body, publishedAt,
  "author": author->{name, title, bio},
  seo, generationMeta
}`;

const SLUGS_QUERY = `*[_type == "post" && status == "published" && defined(slug.current)].slug.current`;

export const getBlogPosts = async (): Promise<BlogPostListItem[]> => {
  if (!sanityConfigured) return [];
  try {
    return await sanityClient.fetch<BlogPostListItem[]>(POSTS_QUERY);
  } catch {
    return [];
  }
};

export const getBlogPost = async (slug: string): Promise<BlogPost | null> => {
  if (!sanityConfigured) return null;
  try {
    return await sanityClient.fetch<BlogPost | null>(POST_BY_SLUG_QUERY, {
      slug,
    });
  } catch {
    return null;
  }
};

export const getBlogSlugs = async (): Promise<string[]> => {
  if (!sanityConfigured) return [];
  try {
    return await sanityClient.fetch<string[]>(SLUGS_QUERY);
  } catch {
    return [];
  }
};
