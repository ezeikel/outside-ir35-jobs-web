import type { Viewport } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import PostJob from '@/components/PostJob/PostJob';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const JobPostPage = () => (
  <PageWrap>
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 max-w-xl">
        <h1 className="text-4xl leading-none">Post a contract</h1>
        <p className="mt-2 text-muted-foreground">
          Reach UK limited-company contractors who only want outside-IR35 work.
          Day rate, mode and your IR35 position, shown up front.
        </p>
      </header>
      <PostJob />
    </div>
  </PageWrap>
);

export default JobPostPage;
