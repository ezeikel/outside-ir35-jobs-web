import 'server-only';
import type {
  JobIR35Signal,
  JobSource,
  WorkMode,
} from '@outside-ir35-jobs/db/types';
import { IR35_LABELS, OUTSIDE_LEANING_SIGNALS } from '@/lib/ir35/labels';

/**
 * Mobile-facing job DTOs. The RN app can't import the web's React components or
 * server types, so these are plain-JSON shapes the app renders directly. The
 * IR35 label mapping mirrors components/trust/JobMeta.tsx EXACTLY — honesty is
 * load-bearing: we surface only the client's attributed position, never a
 * platform assertion (see docs/ir35-trust-model.md).
 */

// JobIR35Signal / WorkMode / JobSource are string enums (members === string
// literals), so we key these maps by the raw string for simplicity.

// IR35 labels come from the canonical map (lib/ir35/labels.ts) — single source
// of truth shared with the web chip + email so they never drift.

const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ON_SITE: 'On-site',
};

// OUTSIDE_LEANING_SIGNALS (which signals mean the client has stated/supported an
// outside position) is imported from the canonical lib/ir35/labels.ts.

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

const stripHtml = (html: string | null | undefined): string =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export type MobileJobCard = {
  id: string;
  position: string;
  companyName: string;
  companyLogo: string | null;
  location: string;
  dayRate: number[];
  ir35Signal: JobIR35Signal;
  ir35Label: string;
  workMode: WorkMode;
  workModeLabel: string;
  contractLengthDays: number | null;
  source: JobSource;
  postedAt: string; // ISO
};

type JobCardRow = {
  id: string;
  position: string;
  companyName: string;
  companyLogo: string | null;
  location: unknown;
  dayRate: number[];
  workMode: WorkMode;
  ir35Signal: JobIR35Signal;
  contractLength: number | null;
  source: JobSource;
  createdAt: Date | string;
};

export const toMobileJobCard = (row: JobCardRow): MobileJobCard => ({
  id: row.id,
  position: row.position,
  companyName: row.companyName,
  companyLogo: row.companyLogo,
  location: locationAddress(row.location),
  dayRate: row.dayRate?.length ? row.dayRate : [0],
  ir35Signal: row.ir35Signal ?? ('UNKNOWN' as JobIR35Signal),
  ir35Label: IR35_LABELS[row.ir35Signal ?? ('UNKNOWN' as JobIR35Signal)],
  workMode: row.workMode ?? ('REMOTE' as WorkMode),
  workModeLabel: WORK_MODE_LABELS[row.workMode ?? ('REMOTE' as WorkMode)],
  contractLengthDays: row.contractLength ?? null,
  source: row.source ?? ('NATIVE' as JobSource),
  postedAt: new Date(row.createdAt).toISOString(),
});

export type MobileJobDetail = MobileJobCard & {
  descriptionHtml: string;
  descriptionText: string;
  howToApplyHtml: string;
  sourceUrl: string | null;
  // Attributed IR35 claim — present only when the client states an outside
  // position. Never a platform assertion; always attributed to the client.
  ir35Claim: { text: string; attributedTo: string; statedAt: string } | null;
};

type JobDetailRow = JobCardRow & {
  description: string | null;
  howToApply: string | null;
  sourceUrl: string | null;
};

export const toMobileJobDetail = (row: JobDetailRow): MobileJobDetail => {
  const card = toMobileJobCard(row);
  const isOutsideLeaning = OUTSIDE_LEANING_SIGNALS.includes(
    row.ir35Signal as never,
  );
  return {
    ...card,
    descriptionHtml: row.description ?? '',
    descriptionText: stripHtml(row.description),
    howToApplyHtml: row.howToApply ?? '',
    sourceUrl: row.sourceUrl,
    ir35Claim: isOutsideLeaning
      ? {
          text: 'This role is intended to be outside IR35.',
          attributedTo: `${row.companyName} (client)`,
          statedAt: new Date(row.createdAt).toISOString(),
        }
      : null,
  };
};
