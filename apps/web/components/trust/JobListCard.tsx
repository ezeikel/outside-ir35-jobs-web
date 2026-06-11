import Link from 'next/link';
import cn from '@/utils/cn';
import {
  ContractLengthPill,
  DayRatePill,
  IR35SignalChip,
  type JobIR35Signal,
  type WorkMode,
  WorkModePill,
} from './JobMeta';

/**
 * JobListCard — the core job-board surface.
 *
 * Register direction: list-leaning card, comparison-ready. Strict internal grid
 * so rates and signals line up down the page. Day rate is right-aligned and
 * prominent; IR35 signal (the client's claim) and mode/length sit as a quiet
 * meta row. Serif is reserved for the job-detail page, NOT this dense list —
 * the title here is Inter Tight for scannability.
 */

export type JobListCardData = {
  id: string;
  position: string;
  companyName: string;
  companyLogo?: string | null;
  location: string;
  dayRate: number[];
  ir35Signal: JobIR35Signal;
  workMode: WorkMode;
  contractLengthDays?: number | null;
  /** "2 days ago", "new" — display string. */
  postedLabel?: string;
  /** Aggregated listings link out; native ones go to the detail page. */
  source?: 'NATIVE' | 'AGGREGATED';
  href: string;
};

const JobListCard = ({
  job,
  className,
}: {
  job: JobListCardData;
  className?: string;
}) => (
  <Link
    href={job.href}
    className={cn(
      'group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-4">
      {/* Left: identity + title */}
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-sm font-semibold text-muted-foreground">
          {job.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companyLogo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            job.companyName.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-sans text-base font-semibold leading-tight text-foreground group-hover:text-foreground">
            {job.position}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {job.companyName} · {job.location}
          </p>
        </div>
      </div>

      {/* Right: rate + posted */}
      <div className="shrink-0 text-right">
        <DayRatePill rate={job.dayRate} />
        {job.postedLabel && (
          <p className="mt-0.5 text-xs text-muted-foreground tabular">
            {job.postedLabel}
          </p>
        )}
      </div>
    </div>

    {/* Meta row */}
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <IR35SignalChip signal={job.ir35Signal} />
      <WorkModePill mode={job.workMode} />
      {job.contractLengthDays != null && (
        <ContractLengthPill days={job.contractLengthDays} />
      )}
      {job.source === 'AGGREGATED' && (
        <span className="ml-auto text-xs text-muted-foreground">
          via source ↗
        </span>
      )}
    </div>
  </Link>
);

export default JobListCard;
