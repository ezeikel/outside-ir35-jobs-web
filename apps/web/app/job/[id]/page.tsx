import type { Viewport } from 'next';
import JobPost from '@/components/JobPost/JobPost';
import PageWrap from '@/components/PageWrap/PageWrap';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

interface JobPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

const JobPostPage = async ({ params }: JobPostPageProps) => {
  const { id } = await params;

  return (
    <PageWrap>
      <JobPost id={id} />
    </PageWrap>
  );
};

export default JobPostPage;
