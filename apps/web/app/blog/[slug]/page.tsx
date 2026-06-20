import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPost from '@/components/Blog/BlogPost';
import PageWrap from '@/components/PageWrap/PageWrap';
import { getBlogPost, getBlogSlugs } from '@/lib/sanity/queries';

export const revalidate = 3600;

export const generateStaticParams = async () => {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
};

type Params = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({
  params,
}: Params): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Post not found' };
  const title = post.seo?.metaTitle || post.title;
  const description = post.seo?.metaDescription || post.excerpt;
  return {
    title,
    description,
    keywords: post.seo?.keywords ?? undefined,
    openGraph: { title, description, type: 'article' },
  };
};

const BlogPostPage = async ({ params }: Params) => {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <PageWrap>
      <BlogPost post={post} />
    </PageWrap>
  );
};

export default BlogPostPage;
