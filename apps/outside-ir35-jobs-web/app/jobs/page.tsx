import type { Viewport } from 'next';
import JobPosts from '@/components/JobPosts/JobPosts';
import PageWrap from '@/components/PageWrap/PageWrap';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const JobsPage = () => (
  <PageWrap className="gap-y-16">
    <JobPosts />
  </PageWrap>
);

export default JobsPage;
