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

const JobsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const sp = await searchParams;
  // The filter bar only submits scalars; flatten defensively.
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const params = {
    q: str(sp.q),
    location: str(sp.location),
    ir35: str(sp.ir35),
    mode: str(sp.mode),
    minRate: str(sp.minRate),
    posted: str(sp.posted),
  };

  return (
    <PageWrap className="gap-y-16">
      <JobPosts params={params} />
    </PageWrap>
  );
};

export default JobsPage;
