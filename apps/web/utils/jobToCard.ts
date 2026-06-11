import type {
  JobIR35Signal,
  JobListCardData,
  WorkMode,
} from '@/components/trust';

/**
 * Adapts a DB `Job` row to the presentational `JobListCardData` shape.
 *
 * INTERIM: the schema still has the legacy `verifiedIR35Status` boolean rather
 * than the `ir35Signal` enum from the trust model (that's a Phase 1 migration —
 * see docs/ir35-trust-model.md). Until then we map the boolean honestly: a
 * truthy flag means the poster claimed outside ("client states"), never a
 * platform assertion; otherwise the signal is UNKNOWN. We never render a
 * "verified/SDS" signal off the old boolean.
 */

type DbJobLike = {
  id: string;
  position: string;
  companyName: string;
  companyLogo?: string | null;
  location: unknown; // JSON: { address, placeId, coordinates }
  dayRate: number[];
  workMode: string;
  contractLength?: number | null;
  verifiedIR35Status?: boolean;
  createdAt?: Date | string;
};

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

const postedLabel = (createdAt?: Date | string): string | undefined => {
  if (!createdAt) return undefined;
  const then = new Date(createdAt).getTime();
  if (Number.isNaN(then)) return undefined;
  const hours = Math.floor((Date.now() - then) / 36e5);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const jobToCard = (job: DbJobLike): JobListCardData => ({
  id: job.id,
  position: job.position,
  companyName: job.companyName,
  companyLogo: job.companyLogo,
  location: locationAddress(job.location),
  dayRate: job.dayRate?.length ? job.dayRate : [0],
  // Honest interim mapping — never derive a verified/SDS signal from the old boolean.
  ir35Signal: (job.verifiedIR35Status
    ? 'CLIENT_INTENDS_OUTSIDE'
    : 'UNKNOWN') satisfies JobIR35Signal,
  workMode: (job.workMode as WorkMode) ?? 'REMOTE',
  contractLengthDays: job.contractLength ?? null,
  postedLabel: postedLabel(job.createdAt),
  source: 'NATIVE',
  href: `/job/${job.id}`,
});
