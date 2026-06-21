import { format } from 'date-fns';
import Link from 'next/link';
import type { DashboardJob } from '@/app/actions';
import { type ContractorTrustTier, VerifiedBadge } from '@/components/trust';

const TIER_BADGE_LABEL: Record<ContractorTrustTier, string> = {
  SELF_DECLARED: 'Self-declared',
  IDENTITY_VERIFIED: 'Identity verified',
  DOCUMENTS_ON_FILE: 'Documents on file',
  COMPLIANCE_CURRENT: 'Compliance current',
};

const badgeLevel = (tier: ContractorTrustTier) =>
  tier === 'COMPLIANCE_CURRENT' || tier === 'IDENTITY_VERIFIED'
    ? 'verified'
    : tier === 'DOCUMENTS_ON_FILE'
      ? 'partial'
      : 'unverified';

const Dashboard = ({ jobs }: { jobs: DashboardJob[] }) => {
  const totalApplicants = jobs.reduce((n, j) => n + j.applicants.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          For posters
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          Your jobs &amp; applicants
        </h1>
        <p className="mt-3 text-muted-foreground">
          {jobs.length === 0
            ? 'You have not posted any jobs yet.'
            : `${jobs.length} job${jobs.length === 1 ? '' : 's'} · ${totalApplicants} applicant${
                totalApplicants === 1 ? '' : 's'
              }.`}
        </p>
      </header>

      {jobs.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-2xl">Post your first contract</p>
          <Link
            href="/job/post"
            className="mt-3 inline-block text-verified underline"
          >
            Post a job
          </Link>
        </section>
      ) : (
        <ul className="space-y-6">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/job/${job.id}`}
                  className="font-display text-xl hover:text-foreground"
                >
                  {job.position}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {job.applicants.length} applicant
                  {job.applicants.length === 1 ? '' : 's'}
                  {!job.isActive ? ' · closed' : ''}
                </span>
              </div>

              {job.applicants.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No applications yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {job.applicants.map((a) => (
                    <li
                      key={a.applicationId}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/dashboard/applicant/${a.applicantId}`}
                          className="font-medium hover:text-verified"
                        >
                          {a.name}
                        </Link>
                        <VerifiedBadge
                          level={badgeLevel(a.trustTier)}
                          label={TIER_BADGE_LABEL[a.trustTier]}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Applied {format(new Date(a.appliedAt), 'd MMM yyyy')}
                      </p>
                      {a.message ? (
                        <p className="mt-2 text-sm text-foreground/80">
                          “{a.message}”
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
