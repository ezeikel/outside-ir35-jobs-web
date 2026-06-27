import { PortableText } from '@portabletext/react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { BlogPost as BlogPostType } from '@/lib/sanity/queries';
import { portableTextComponents } from './PortableTextComponents';

// Format a date string, returning '' for missing OR INVALID values. A present-
// but-malformed date (e.g. a bad sourcesCheckedAt) threw `RangeError: Invalid
// time value` from date-fns format(), which failed the prod prerender of that
// blog post — guard before formatting.
const safeDate = (value: string | null | undefined, fmt: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : format(d, fmt);
};

const BlogPost = ({ post }: { post: BlogPostType }) => (
  <article className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <Link
      href="/blog"
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      ← All posts
    </Link>

    <header className="mt-4 mb-8">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">
        {post.title}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {safeDate(post.publishedAt, 'd MMMM yyyy')}
        {post.author?.name ? ` · ${post.author.name}` : ''}
      </p>
      {safeDate(post.generationMeta?.sourcesCheckedAt, 'd MMM yyyy') ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Primary sources last checked{' '}
          {safeDate(post.generationMeta?.sourcesCheckedAt, 'd MMM yyyy')}
        </p>
      ) : null}
    </header>

    <div className="text-[15px]">
      <PortableText value={post.body} components={portableTextComponents} />
    </div>

    {post.author?.bio ? (
      <footer className="mt-12 border-t border-border pt-6">
        <p className="font-display text-lg">{post.author.name}</p>
        {post.author.title ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {post.author.title}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">{post.author.bio}</p>
      </footer>
    ) : null}
  </article>
);

export default BlogPost;
