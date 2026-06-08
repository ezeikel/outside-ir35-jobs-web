import type { Viewport } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import JobPost from '@/components/JobPost/JobPost';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

type JobPostPageProps = {
  params: {
    id: string;
  };
};

const JobPostPage = ({ params: { id } }: JobPostPageProps) => (
  <PageWrap>
    <JobPost id={id} />
  </PageWrap>
);

export default JobPostPage;
