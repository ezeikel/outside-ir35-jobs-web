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

export type JobIR35Signal =
  | 'CLIENT_INTENDS_OUTSIDE'
  | 'SDS_ISSUED'
  | 'SMALL_CLIENT_EXEMPT'
  | 'CONTRACT_REVIEW_HELD'
  | 'UNKNOWN'
  | 'INSIDE';

const IR35: Record<
  JobIR35Signal,
  {
    label: string;
    tone: 'verified' | 'neutral' | 'muted';
    icon?: typeof faCircleCheck;
  }
> = {
  SDS_ISSUED: {
    label: 'Outside · SDS issued',
    tone: 'verified',
    icon: faCircleCheck,
  },
  CONTRACT_REVIEW_HELD: {
    label: 'Outside · contract reviewed',
    tone: 'verified',
    icon: faCircleCheck,
  },
  CLIENT_INTENDS_OUTSIDE: { label: 'Outside (client states)', tone: 'neutral' },
  SMALL_CLIENT_EXEMPT: { label: 'Outside · small-client', tone: 'neutral' },
  UNKNOWN: { label: 'IR35 not stated', tone: 'muted', icon: faCircleQuestion },
  INSIDE: { label: 'Inside IR35', tone: 'muted' },
};

export const IR35SignalChip = ({
  signal,
  className,
}: {
  signal: JobIR35Signal;
  className?: string;
}) => {
  const cfg = IR35[signal];
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
      {cfg.icon && <FontAwesomeIcon icon={cfg.icon} className="h-3 w-3" />}
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
