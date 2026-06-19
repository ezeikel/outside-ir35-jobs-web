import type { Viewport } from 'next';
import Link from 'next/link';
import { getJobs } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import TakeHomeCalculator from '@/components/TakeHomeCalculator/TakeHomeCalculator';
import { JobListCard } from '@/components/trust';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jobToCard } from '@/utils/jobToCard';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const HomePage = async () => {
  // Real jobs, newest first — links resolve to actual cuid-keyed job pages
  // (the old DUMMY_JOBS linked to /job/1..6, which 404'd).
  const jobs = await getJobs();
  const latestContracts = jobs.slice(0, 6).map(jobToCard);

  return (
    <PageWrap className="gap-y-12 p-0 pb-16">
      {/* Hero */}
      <div className="relative w-screen">
        <video
          className="size-full object-cover"
          autoPlay={true}
          loop={true}
          muted={true}
          playsInline={true}
          style={{ minHeight: 'calc(100vh - 68px)' }}
        >
          <source src="/videos/man-using-laptop.mp4" type="video/mp4" />
          Your browser does not support the video tag.
          <track kind="captions" />
        </video>
        <div className="absolute inset-0 grid grid-cols-1 items-center gap-8 bg-ink-950/55 p-8 md:grid-cols-2 md:p-16">
          <div className="max-w-xl">
            <h1 className="font-display text-5xl leading-[1.05] text-white md:text-6xl">
              Only outside-IR35 contracts. Nothing else.
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-200">
              Stop filtering LinkedIn. Day rate, work mode and the client’s IR35
              signal — surfaced up front, on every role.
            </p>
            <form className="mt-8 flex max-w-lg gap-2">
              <Input
                className="flex-1 border-transparent bg-white text-foreground placeholder:text-muted-foreground"
                placeholder="Role, skill or company"
                type="text"
              />
              <Button asChild>
                <Link href="/jobs">Search</Link>
              </Button>
            </form>
          </div>
          <TakeHomeCalculator className="hidden md:block" />
        </div>
      </div>

      {/* Latest contracts */}
      <section className="mx-auto w-full max-w-3xl px-4">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl leading-none">Latest contracts</h2>
          <Link
            href="/jobs"
            className="text-sm font-medium text-link hover:underline"
          >
            View all →
          </Link>
        </div>
        {latestContracts.length > 0 ? (
          <div className="space-y-3">
            {latestContracts.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No live contracts yet — check back soon.
            </p>
            <Button asChild className="mt-4">
              <Link href="/job/post">Post the first one</Link>
            </Button>
          </div>
        )}
      </section>
    </PageWrap>
  );
};

export default HomePage;
