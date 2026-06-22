import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeoSkills, getSkillBenchmark, searchJobs } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import { JobListCard } from '@/components/trust';
import { IR35_BUCKET_LABEL, type Ir35Bucket } from '@/lib/benchmarks/compute';
import { skillDisplay, skillToSlug } from '@/lib/seo/skill-slug';
import { jobToCard } from '@/utils/jobToCard';

export const revalidate = 3600; // hourly — benchmarks/listings change slowly

// Only generate pages for skills that clear the day-rate sample gate — every
// programmatic page is data-backed (no thin content). Other slugs 404.
export const generateStaticParams = async () => {
  const skills = await getSeoSkills();
  return skills.map((skill) => ({ skill: skillToSlug(skill) }));
};

// Resolve a URL slug back to the stored skill by matching against the gated set
// (the slug is lossy, so we never reverse it — we match forward).
const resolveSkill = async (slug: string): Promise<string | null> => {
  const skills = await getSeoSkills();
  return skills.find((s) => skillToSlug(s) === slug) ?? null;
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ skill: string }>;
}): Promise<Metadata> => {
  const { skill: slug } = await params;
  const skill = await resolveSkill(slug);
  if (!skill) return { title: 'Contracts — Outside IR35 Jobs' };
  const name = skillDisplay(skill);
  return {
    title: `${name} outside-IR35 contracts & day rates — Outside IR35 Jobs`,
    description: `Live ${name} outside-IR35 contract roles and median day rates by IR35 position, aggregated on outsideir35.jobs.`,
    alternates: { canonical: `/contracts/${slug}` },
  };
};

const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`;

const SkillContractsPage = async ({
  params,
}: {
  params: Promise<{ skill: string }>;
}) => {
  const { skill: slug } = await params;
  const skill = await resolveSkill(slug);
  if (!skill) notFound();

  const name = skillDisplay(skill);
  const [benchmark, rows] = await Promise.all([
    getSkillBenchmark(skill),
    searchJobs({ q: skill }),
  ]);
  const jobs = rows.map(jobToCard);
  const outside = benchmark.find((b) => b.ir35Bucket === 'OUTSIDE');

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {name} contracts
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          {name} outside-IR35 contracts
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Live {name} contract roles and day-rate benchmarks, aggregated on this
          board. We show the IR35 position each client states — we never
          determine a role’s IR35 status.
        </p>

        {/* Day-rate benchmark for this skill (gated; only shown when there's data). */}
        {benchmark.length > 0 ? (
          <section className="mt-8 rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-sm font-medium">
              {name} day rates{' '}
              {outside ? `· ${fmt(outside.median)} median` : ''}
            </p>
            <div className="space-y-2">
              {benchmark.map((b) => (
                <div
                  key={b.ir35Bucket}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {IR35_BUCKET_LABEL[b.ir35Bucket as Ir35Bucket]}
                  </span>
                  <span>
                    <span className="font-medium">{fmt(b.median)}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      ({fmt(b.p25)}–{fmt(b.p75)}, {b.sampleSize} listings)
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Median day rate from live listings on this board, by the IR35
              position each client states.
            </p>
          </section>
        ) : null}

        {/* Live contracts for this skill. */}
        <section className="mt-8">
          <h2 className="text-2xl">Open {name} contracts</h2>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No live {name} contracts right now —{' '}
              <Link href="/jobs" className="text-link hover:underline">
                browse all outside-IR35 roles
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {jobs.map((job) => (
                <JobListCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrap>
  );
};

export default SkillContractsPage;
