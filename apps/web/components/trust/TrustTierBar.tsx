import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';

/**
 * TrustTierBar — the contractor trust ladder, T0 → T3.
 *
 * A refined segmented progress bar (Uxcel "earn your verification badge"
 * model). Each tier means a specific, defensible set of checks — never a
 * status guarantee. Green ticks ONLY on register-verified tiers (T1+). The
 * exact criteria + dates live on the tap-through verification page; this is the
 * at-a-glance summary. See docs/ir35-trust-model.md.
 */

export type ContractorTrustTier =
  | 'SELF_DECLARED' // T0
  | 'IDENTITY_VERIFIED' // T1
  | 'DOCUMENTS_ON_FILE' // T2
  | 'COMPLIANCE_CURRENT'; // T3

const TIERS: { key: ContractorTrustTier; label: string; short: string }[] = [
  { key: 'SELF_DECLARED', label: 'Self-declared', short: 'T0' },
  { key: 'IDENTITY_VERIFIED', label: 'Identity verified', short: 'T1' },
  { key: 'DOCUMENTS_ON_FILE', label: 'Documents on file', short: 'T2' },
  { key: 'COMPLIANCE_CURRENT', label: 'Compliance current', short: 'T3' },
];

const tierIndex = (t: ContractorTrustTier) =>
  TIERS.findIndex((x) => x.key === t);

type TrustTierBarProps = {
  current: ContractorTrustTier;
  /** Show tier labels under the segments. */
  showLabels?: boolean;
  className?: string;
};

const TrustTierBar = ({
  current,
  showLabels = true,
  className,
}: TrustTierBarProps) => {
  const reached = tierIndex(current);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1.5">
        {TIERS.map((tier, i) => {
          const isReached = i <= reached;
          // T0 (self-declared) is "reached" but never green — it's not verification.
          const isVerified = isReached && i >= 1;
          return (
            <div
              key={tier.key}
              className="flex flex-1 items-center"
              aria-label={tier.label}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular',
                  isVerified &&
                    'border-verified bg-verified text-verified-foreground',
                  isReached &&
                    !isVerified &&
                    'border-ink-400 bg-ink-200 text-ink-700',
                  !isReached && 'border-border bg-card text-muted-foreground',
                )}
              >
                {isVerified ? (
                  <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                ) : (
                  tier.short
                )}
              </span>
              {i < TIERS.length - 1 && (
                <span
                  className={cn(
                    'mx-1 h-0.5 flex-1 rounded-full',
                    i < reached ? 'bg-verified/50' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex items-center justify-between">
          {TIERS.map((tier, i) => (
            <span
              key={tier.key}
              className={cn(
                'text-[11px] leading-tight',
                i === reached
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
                i === 0 && 'text-left',
                i === TIERS.length - 1 && 'text-right',
              )}
              style={{ width: '25%' }}
            >
              {tier.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustTierBar;
