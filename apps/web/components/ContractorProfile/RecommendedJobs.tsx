import Link from 'next/link';
import type { RecommendationResult } from '@/app/actions';
import { JobListCard } from '@/components/trust';
import { jobToCard } from '@/utils/jobToCard';

/**
 * "Recommended for you" — jobs matched to the contractor's parsed-CV profile by
 * semantic similarity. Honest states only: no parsed CV → prompt to upload one;
 * a parsed CV with no strong matches → say so plainly (we don't pad the list
 * with weak matches). Recommendations are based on the contractor's own CV, not
 * any platform judgement about them.
 */
const RecommendedJobs = ({ data }: { data: RecommendationResult }) => {
  if (data.status === 'no_cv') {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/50 p-5">
        <p className="text-sm font-medium">Recommended for you</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CV above and we’ll match you to roles listed as
          outside-IR35 by clients that fit your skills and experience.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Recommended for you</p>
        <p className="text-xs text-muted-foreground">Matched to your CV</p>
      </div>

      {data.jobs.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No strong matches on the board right now. We’ll keep looking as new
          contracts are listed —{' '}
          <Link href="/jobs" className="text-verified underline">
            browse all contracts
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.jobs.map((job) => (
            <li key={job.id}>
              <JobListCard job={jobToCard(job)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecommendedJobs;
