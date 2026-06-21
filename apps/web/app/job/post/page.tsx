import type { Viewport } from 'next';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import PostJob from '@/components/PostJob/PostJob';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const JobPostPage = async () => {
  const session = await auth();

  // Posting is a hiring action: must be signed in, onboarded, and a JOB_POSTER.
  if (!session?.userId) {
    redirect('/api/auth/signin');
  }
  if (!session.onboarded) {
    redirect('/onboarding');
  }
  if (session.role !== 'JOB_POSTER') {
    redirect('/jobs');
  }

  return (
    <PageWrap>
      {/* Google Maps (Places) powers the location autocomplete in PostJob's
          LocationInput — loaded ONLY here, lazily, so a Maps load failure
          degrades the autocomplete instead of 500-ing the whole site (it used to
          be a global beforeInteractive script that crashed every page). */}
      {process.env.GOOGLE_MAPS_API_KEY ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="lazyOnload"
        />
      ) : null}
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 max-w-xl">
          <h1 className="text-4xl leading-none">Post a contract</h1>
          <p className="mt-2 text-muted-foreground">
            Reach UK limited-company contractors who only want outside-IR35
            work. Day rate, mode and your IR35 position, shown up front.
          </p>
        </header>
        <PostJob />
      </div>
    </PageWrap>
  );
};

export default JobPostPage;
