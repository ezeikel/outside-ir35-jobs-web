import {
  faCircleCheck,
  faCircleXmark,
  faClock,
  faMinus,
} from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';

/**
 * VerifiedFactRow — an objectively checkable fact, rendered as a citation.
 *
 * The signature of the Register direction: honesty *looks* like editorial
 * integrity. Each row reads like a reference —
 *   "Companies House — Active · verified 11 Jun 2026"
 * Source + status + timestamp are always present. Green tick ONLY when we
 * actually verified against an official register. We never state more than the
 * check confirms (see docs/ir35-trust-model.md).
 */

export type FactStatus = 'verified' | 'pending' | 'failed' | 'none';

const STATUS: Record<FactStatus, { icon: typeof faCircleCheck; tint: string }> =
  {
    verified: { icon: faCircleCheck, tint: 'text-verified' },
    pending: { icon: faClock, tint: 'text-aging' },
    failed: { icon: faCircleXmark, tint: 'text-destructive' },
    none: { icon: faMinus, tint: 'text-muted-foreground' },
  };

type VerifiedFactRowProps = {
  /** The register / authority checked, e.g. "Companies House", "HMRC VAT". */
  source: string;
  /** The fact, e.g. "Active", "VAT GB123456789 valid". */
  fact: string;
  status: FactStatus;
  /** ISO or display date the check was performed. */
  checkedOn?: string;
  className?: string;
};

const VERB: Record<FactStatus, string> = {
  verified: 'verified',
  pending: 'checking',
  failed: 'could not verify',
  none: '',
};

const VerifiedFactRow = ({
  source,
  fact,
  status,
  checkedOn,
  className,
}: VerifiedFactRowProps) => {
  const cfg = STATUS[status];

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 border-b border-border py-2.5 last:border-b-0',
        className,
      )}
    >
      <FontAwesomeIcon
        icon={cfg.icon}
        className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.tint)}
      />
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-medium text-foreground">{source}</span>
        <span className="text-muted-foreground"> — </span>
        <span className="text-foreground">{fact}</span>
        {checkedOn && status !== 'none' && (
          <span className="text-muted-foreground tabular">
            {' · '}
            {VERB[status]} {checkedOn}
          </span>
        )}
      </div>
    </div>
  );
};

export default VerifiedFactRow;
