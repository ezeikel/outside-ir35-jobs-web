import {
  faCircle,
  faCircleCheck,
  faCircleExclamation,
  faClock,
} from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';

/**
 * CompletenessRing + DocStatusRow — the "build your pack once" surface.
 *
 * CompletenessRing: a Peerlist-style progress ring for profile completeness.
 * DocStatusRow: per-document live status (on file / expiring / pending /
 * failed) with honest copy — "on file, expires DD/MM/YYYY", never "verified"
 * beyond what we checked. See docs/ir35-trust-model.md.
 */

type CompletenessRingProps = {
  /** 0–100. */
  percent: number;
  size?: number;
  label?: string;
  className?: string;
};

export const CompletenessRing = ({
  percent,
  size = 72,
  label,
  className,
}: CompletenessRingProps) => {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;
  const complete = clamped >= 100;

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={complete ? 'var(--verified)' : 'var(--primary)'}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular">
          {clamped}%
        </span>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
};

/* ── Per-document status row ── */

export type DocStatus =
  | 'on_file'
  | 'expiring'
  | 'pending'
  | 'missing'
  | 'failed';

const DOC: Record<DocStatus, { icon: typeof faCircleCheck; tint: string }> = {
  on_file: { icon: faCircleCheck, tint: 'text-verified' },
  expiring: { icon: faCircleExclamation, tint: 'text-aging' },
  pending: { icon: faClock, tint: 'text-aging' },
  missing: { icon: faCircle, tint: 'text-muted-foreground' },
  failed: { icon: faCircleExclamation, tint: 'text-destructive' },
};

type DocStatusRowProps = {
  /** e.g. "Professional Indemnity insurance". */
  name: string;
  status: DocStatus;
  /** e.g. "expires 14 Mar 2027", "£1m cover" — honest, factual detail. */
  detail?: string;
  className?: string;
};

export const DocStatusRow = ({
  name,
  status,
  detail,
  className,
}: DocStatusRowProps) => {
  const cfg = DOC[status];
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={cfg.icon}
        className={cn('h-4 w-4 shrink-0', cfg.tint)}
      />
      <span className="flex-1 text-sm text-foreground">{name}</span>
      {detail && (
        <span className="text-xs text-muted-foreground tabular">{detail}</span>
      )}
    </div>
  );
};
