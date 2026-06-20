import type { Metadata } from 'next';
import BlogList from '@/components/Blog/BlogList';
import PageWrap from '@/components/PageWrap/PageWrap';
import { getBlogPosts } from '@/lib/sanity/queries';

export const metadata: Metadata = {
  title: 'Outside IR35 blog — guides & contractor day-rate data',
  description:
    'Practical guidance for UK limited-company contractors who want outside-IR35 work: IR35 explained, compliance, and day-rate market data. We never determine IR35 status.',
};

// Revalidate hourly — the blog updates at most once a day via the cron.
export const revalidate = 3600;

const BlogPage = async () => {
  const posts = await getBlogPosts();

  return (
    <PageWrap>
      <BlogList posts={posts} />
    </PageWrap>
  );
};

export default BlogPage;
