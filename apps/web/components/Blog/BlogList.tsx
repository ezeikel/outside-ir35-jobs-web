import { format } from 'date-fns';
import Link from 'next/link';
import type { BlogPostListItem } from '@/lib/sanity/queries';

// '' for missing OR invalid dates — a malformed publishedAt would throw from
// format() and break the listing prerender.
const safeDate = (value: string | null | undefined, fmt: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : format(d, fmt);
};

const BlogList = ({ posts }: { posts: BlogPostListItem[] }) => (
  <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
    <header className="mb-10 max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Guides &amp; market data
      </p>
      <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
        The outside-IR35 blog
      </h1>
      <p className="mt-3 text-muted-foreground">
        Practical guidance for UK limited-company contractors who want
        outside-IR35 work. We surface what clients state and what is objectively
        checkable, and we never determine IR35 status.
      </p>
    </header>

    {posts.length === 0 ? (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="font-display text-2xl">Nothing published yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          New guides are on the way. Check back soon.
        </p>
      </section>
    ) : (
      <ul className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <li key={post._id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block h-full rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
            >
              <p className="text-xs text-muted-foreground">
                {safeDate(post.publishedAt, 'd MMM yyyy')}
                {post.authorName ? ` · ${post.authorName}` : ''}
              </p>
              <h2 className="mt-2 font-display text-xl leading-snug group-hover:text-foreground">
                {post.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default BlogList;
