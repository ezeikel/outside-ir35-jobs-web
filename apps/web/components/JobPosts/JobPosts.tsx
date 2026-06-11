import { getJobs } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import { JobListCard } from '@/components/trust';
import { jobToCard } from '@/utils/jobToCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const JobPosts = async () => {
  const jobPosts = await getJobs();
  const jobs = (jobPosts ?? []).map(jobToCard);

  return (
    <PageWrap className="gap-y-8">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Masthead */}
        <header className="mb-6">
          <h1 className="text-4xl leading-none">Outside-IR35 contracts</h1>
          <p className="mt-2 text-muted-foreground">
            {jobs.length > 0
              ? `${jobs.length} contract${jobs.length === 1 ? '' : 's'} — day rate, mode and IR35 signal up front.`
              : 'Day rate, work mode and the client’s IR35 signal, up front.'}
          </p>
        </header>

        {/* Filter bar */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Search for jobs"
              className="flex-1"
              placeholder="Role, skill or company"
            />
            <Input
              aria-label="Location"
              className="flex-1"
              placeholder="City or postcode"
            />
            <Button type="submit">Search</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select>
              <SelectTrigger aria-label="IR35 signal">
                <SelectValue placeholder="IR35 signal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outside-evidenced">
                  Outside · evidenced
                </SelectItem>
                <SelectItem value="outside-stated">Outside · stated</SelectItem>
                <SelectItem value="any">Any signal</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger aria-label="Work mode">
                <SelectValue placeholder="Work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="on-site">On-site</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger aria-label="Day rate">
                <SelectValue placeholder="Day rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="400">£400+</SelectItem>
                <SelectItem value="500">£500+</SelectItem>
                <SelectItem value="600">£600+</SelectItem>
                <SelectItem value="700">£700+</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger aria-label="Posted">
                <SelectValue placeholder="Posted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Past 24 hours</SelectItem>
                <SelectItem value="week">Past week</SelectItem>
                <SelectItem value="month">Past month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {jobs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-2xl">No contracts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — new outside-IR35 roles are added regularly.
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
