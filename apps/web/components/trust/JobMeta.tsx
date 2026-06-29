import {
  faBuilding,
  faCalendarDays,
  faHouseLaptop,
  faLocationDot,
} from '@fortawesome/pro-regular-svg-icons';
import {
  faCircleCheck,
  faCircleQuestion,
} from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IR35_LABEL_META, type IR35Signal } from '@/lib/ir35/labels';
import cn from '@/utils/cn';

/**
 * Job listing meta primitives: day rate, IR35 signal, work mode, length.
 * Day-rate and IR35 signal are the two figures that must be instantly
 * scannable. IR35 signal is the CLIENT's claim (never our assertion) — so the
 * chip is honestly worded and only the "verified/SDS" variant carries weight.
 */

/* ── Day rate (right-aligned, tabular) ── */

type DayRatePillProps = {
  /** Rate in GBP. Single value [500] or range [500, 650]. */
  rate: number[];
  unit?: 'day' | 'hour';
  className?: string;
};

export const DayRatePill = ({
  rate,
  unit = 'day',
  className,
}: DayRatePillProps) => {
  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`;
  const value =
    rate.length > 1 ? `${fmt(rate[0])}–${fmt(rate[1])}` : fmt(rate[0]);
  return (
    <span
      className={cn(
        'tabular text-base font-semibold text-foreground',
        className,
      )}
    >
      {value}
      <span className="ml-0.5 text-xs font-normal text-muted-foreground">
        /{unit}
      </span>
    </span>
  );
};

/* ── IR35 signal chip (the client's claim) ── */

// Re-export the canonical signal type so existing imports of JobIR35Signal from
// this module keep working.
export type JobIR35Signal = IR35Signal;

// Per-signal icons live here (React-specific); label + tone come from the
// canonical lib/ir35/labels.ts so wording never drifts from mobile/email.
const IR35_ICON: Partial<Record<IR35Signal, typeof faCircleCheck>> = {
  SDS_ISSUED: faCircleCheck,
  CONTRACT_REVIEW_HELD: faCircleCheck,
  UNKNOWN: faCircleQuestion,
};

export const IR35SignalChip = ({
  signal,
  className,
}: {
  signal: JobIR35Signal;
  className?: string;
}) => {
  const cfg = IR35_LABEL_META[signal];
  const icon = IR35_ICON[signal];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        cfg.tone === 'verified' &&
          'border-verified/25 bg-verified-muted text-verified',
        cfg.tone === 'neutral' && 'border-border bg-card text-foreground',
        cfg.tone === 'muted' && 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {icon && <FontAwesomeIcon icon={icon} className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
};

/* ── Work mode + contract length pills ── */

export type WorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE';

const MODE: Record<WorkMode, { label: string; icon: typeof faHouseLaptop }> = {
  REMOTE: { label: 'Remote', icon: faHouseLaptop },
  HYBRID: { label: 'Hybrid', icon: faLocationDot },
  ON_SITE: { label: 'On-site', icon: faBuilding },
};

export const MetaPill = ({
  icon,
  children,
  className,
}: {
  icon: typeof faLocationDot;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground',
      className,
    )}
  >
    <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    {children}
  </span>
);

export const WorkModePill = ({
  mode,
  className,
}: {
  mode: WorkMode;
  className?: string;
}) => (
  <MetaPill icon={MODE[mode].icon} className={className}>
    {MODE[mode].label}
  </MetaPill>
);

export const ContractLengthPill = ({
  days,
  className,
}: {
  days: number;
  className?: string;
}) => {
  const months = Math.round(days / 30);
  const label =
    months >= 1 ? `${months} month${months > 1 ? 's' : ''}` : `${days} days`;
  return (
    <MetaPill icon={faCalendarDays} className={className}>
      {label}
    </MetaPill>
  );
};
