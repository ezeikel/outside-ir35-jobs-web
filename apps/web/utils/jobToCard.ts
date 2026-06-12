import type {
  JobIR35Signal,
  JobListCardData,
  WorkMode,
} from '@/components/trust';

/**
 * Adapts a DB `Job` row to the presentational `JobListCardData` shape.
 * The `ir35Signal` and `source` enum members are identical between the DB enums
 * and the trust-component types, so they pass through directly.
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
  ir35Signal?: JobIR35Signal;
  source?: 'NATIVE' | 'AGGREGATED';
  sourceUrl?: string | null;
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
  ir35Signal: job.ir35Signal ?? 'UNKNOWN',
  workMode: (job.workMode as WorkMode) ?? 'REMOTE',
  contractLengthDays: job.contractLength ?? null,
  postedLabel: postedLabel(job.createdAt),
  source: job.source ?? 'NATIVE',
  href: `/job/${job.id}`,
});
