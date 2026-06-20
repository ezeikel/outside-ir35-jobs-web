import Link from 'next/link';
import type { DayRateBenchmark } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  IR35_BUCKET_LABEL,
  type Ir35Bucket,
  MIN_SAMPLE,
} from '@/lib/benchmarks/compute';

const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`;

const BUCKET_TONE: Record<Ir35Bucket, string> = {
  OUTSIDE: 'text-verified',
  INSIDE: 'text-muted-foreground',
  UNKNOWN: 'text-muted-foreground',
};

// Title-case a lowercased skill for display.
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const DayRates = ({ benchmarks }: { benchmarks: DayRateBenchmark[] }) => {
  const totalSample = benchmarks.reduce((sum, b) => sum + b.sampleSize, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Market data
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          Contract day rates
        </h1>
        <p className="mt-3 text-muted-foreground">
          Median UK day rates by skill, from contracts aggregated on this board
          — split by the IR35 position each listing states. We never assert a
          role’s IR35 status; we only report what the listing claims.
        </p>
      </header>

      {benchmarks.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-2xl">Not enough data yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            We publish a day rate only once a skill has at least {MIN_SAMPLE}{' '}
            live listings — so the numbers mean something. The board is still
            filling. Check back soon.
          </p>
          <Button asChild className="mt-6">
            <Link href="/jobs">Browse contracts</Link>
          </Button>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 font-medium">IR35</th>
                  <th className="px-4 py-3 text-right font-medium">Median</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Range (p25–p75)
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Listings</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr
                    key={`${b.skill}-${b.ir35Bucket}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {titleCase(b.skill)}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${BUCKET_TONE[b.ir35Bucket]}`}
                    >
                      {IR35_BUCKET_LABEL[b.ir35Bucket]}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {fmt(b.median)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {fmt(b.p25)}–{fmt(b.p75)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {b.sampleSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Based on {totalSample} live listing
            {totalSample === 1 ? '' : 's'} aggregated on this board, grouped by
            skill and the IR35 position the listing states. Day rates are
            midpoints of any stated range. This is a snapshot of current
            listings, not a market authority — sanity-check against your own
            sources.
          </p>
        </>
      )}
    </div>
  );
};

export default DayRates;
