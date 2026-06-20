import { searchJobs } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import { JobListCard } from '@/components/trust';
import type { SearchParams } from '@/lib/search/filters';
import { jobToCard } from '@/utils/jobToCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const selectClass =
  'h-9 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground';

// Server component. The filter bar is a GET form — native inputs/selects submit
// as URL query params, so search is shareable + needs no client JS.
const JobPosts = async ({ params = {} }: { params?: SearchParams }) => {
  const rows = await searchJobs(params);
  const jobs = rows.map(jobToCard);
  const q = params.q?.trim() ?? '';

  return (
    <PageWrap className="gap-y-8">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Masthead */}
        <header className="mb-6">
          <h1 className="text-4xl leading-none">Outside-IR35 contracts</h1>
          <p className="mt-2 text-muted-foreground">
            {jobs.length > 0
              ? `${jobs.length} contract${jobs.length === 1 ? '' : 's'}${
                  q ? ` ranked by relevance to “${q}”` : ''
                } — day rate, mode and IR35 signal up front.`
              : 'Day rate, work mode and the client’s IR35 signal, up front.'}
          </p>
        </header>

        {/* Filter bar — GET form */}
        <form
          method="get"
          action="/jobs"
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="q"
              defaultValue={params.q ?? ''}
              aria-label="Search for jobs"
              className="flex-1"
              placeholder="Role, skill or company"
            />
            <Input
              name="location"
              defaultValue={params.location ?? ''}
              aria-label="Location"
              className="flex-1"
              placeholder="City or postcode"
            />
            <Button type="submit">Search</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              name="ir35"
              defaultValue={params.ir35 ?? ''}
              aria-label="IR35 signal"
              className={selectClass}
            >
              <option value="">IR35 signal</option>
              <option value="outside">Outside (client states)</option>
              <option value="any">Any signal</option>
            </select>
            <select
              name="mode"
              defaultValue={params.mode ?? ''}
              aria-label="Work mode"
              className={selectClass}
            >
              <option value="">Work mode</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </select>
            <select
              name="minRate"
              defaultValue={params.minRate ?? ''}
              aria-label="Day rate"
              className={selectClass}
            >
              <option value="">Day rate</option>
              <option value="400">£400+</option>
              <option value="500">£500+</option>
              <option value="600">£600+</option>
              <option value="700">£700+</option>
            </select>
            <select
              name="posted"
              defaultValue={params.posted ?? ''}
              aria-label="Posted"
              className={selectClass}
            >
              <option value="">Posted</option>
              <option value="24h">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
            </select>
          </div>
        </form>

        {/* Results */}
        {jobs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-2xl">
              {q ? 'No matches' : 'No contracts yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q
                ? 'Try a broader search or clear the filters.'
                : 'Check back soon — new outside-IR35 roles are added regularly.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {jobs.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </PageWrap>
  );
};

export default JobPosts;
