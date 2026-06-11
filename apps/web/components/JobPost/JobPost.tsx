import Link from 'next/link';
import { getJob } from '@/app/actions';
import HTMLViewer from '@/components/HTMLViewer/HTMLViewer';
import {
  AttributedClaim,
  ContractLengthPill,
  DayRatePill,
  IR35SignalChip,
  type JobIR35Signal,
  VerifiedFactRow,
  type WorkMode,
  WorkModePill,
} from '@/components/trust';
import { Button } from '../ui/button';

interface JobPostProps {
  id: string;
}

const locationAddress = (location: unknown): string => {
  if (
    location &&
    typeof location === 'object' &&
    'address' in location &&
    typeof (location as { address: unknown }).address === 'string'
  ) {
    return (location as { address: string }).address;
  }
  return 'Location not specified';
};

const JobPost = async ({ id }: JobPostProps) => {
  const job = await getJob(id);

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl">Contract not found</h1>
        <p className="mt-2 text-muted-foreground">
          This role may have been filled or removed.
        </p>
        <Button asChild className="mt-6">
          <Link href="/jobs">Browse contracts</Link>
        </Button>
      </div>
    );
  }

  const location = locationAddress(job.location);
  // INTERIM: derive the IR35 signal honestly from the legacy boolean until the
  // Phase 1 ir35Signal enum lands. Never a verified/SDS signal off the boolean.
  // INTERIM: only the legacy boolean distinguishes "client claims outside" from
  // "not stated". Once the Phase 1 ir35Signal enum lands this widens to include
  // SDS_ISSUED / CONTRACT_REVIEW_HELD etc.
  const isOutsideClaim = Boolean(job.verifiedIR35Status);
  const ir35Signal: JobIR35Signal = isOutsideClaim
    ? 'CLIENT_INTENDS_OUTSIDE'
    : 'UNKNOWN';

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/jobs"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All contracts
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        {/* ── Main column: the editorial essay ── */}
        <div className="min-w-0">
          <header>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {job.companyName}
              </span>
              <span>·</span>
              <span>{location}</span>
            </div>
            <h1 className="mt-2 font-display text-4xl leading-[1.1] sm:text-5xl">
              {job.position}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <IR35SignalChip signal={ir35Signal} />
              <WorkModePill mode={(job.workMode as WorkMode) ?? 'REMOTE'} />
              {job.contractLength != null && (
                <ContractLengthPill days={job.contractLength} />
              )}
            </div>
          </header>

          {/* The attributed IR35 claim — the signature pull-quote */}
          {isOutsideClaim && (
            <div className="mt-8">
              <AttributedClaim
                claim="This role is intended to be outside IR35."
                attributedTo={`${job.companyName} (client)`}
                statedOn={new Date(job.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The platform does not determine, verify, or warrant IR35 status.
                The Status Determination Statement is the client&rsquo;s legal
                responsibility. Take your own advice and consider IR35
                insurance.
              </p>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <section className="mt-10">
              <h2 className="text-2xl">About the role</h2>
              <div className="editor-preview mt-3 text-[15px] leading-relaxed text-foreground/90">
                <HTMLViewer html={job.description} />
              </div>
            </section>
          )}

          {/* How to apply */}
          {job.howToApply && (
            <section className="mt-10">
              <h2 className="text-2xl">How to apply</h2>
              <div className="editor-preview mt-3 text-[15px] leading-relaxed text-foreground/90">
                <HTMLViewer html={job.howToApply} />
              </div>
            </section>
          )}
        </div>

        {/* ── Sticky apply sidebar ── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Day rate</span>
              <DayRatePill rate={job.dayRate?.length ? job.dayRate : [0]} />
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Work mode</dt>
                <dd className="font-medium">
                  {(job.workMode ?? 'REMOTE').toString().replace('_', '-')}
                </dd>
              </div>
              {job.contractLength != null && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="font-medium tabular">
                    {Math.round(job.contractLength / 30)} months
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {location}
                </dd>
              </div>
            </dl>

            <Button className="mt-5 w-full">Apply with verified profile</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              One click — share your verified compliance pack.
            </p>
          </div>

          {/* Verified facts about the client */}
          <div className="mt-4 rounded-lg border border-border bg-card p-5">
            <p className="mb-1 text-sm font-medium">Client checks</p>
            <VerifiedFactRow
              source="Companies House"
              fact={`${job.companyName} — lookup`}
              status="none"
            />
            <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
              Company &amp; VAT checks run against official registers when a
              client posts directly.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
};

export default JobPost;
