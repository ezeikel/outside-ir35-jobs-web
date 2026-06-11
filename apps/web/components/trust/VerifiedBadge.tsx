import {
  faShield,
  faShieldCheck,
  faShieldHalved,
} from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';

/**
 * VerifiedBadge — the single, billboard trust mark.
 *
 * Register direction: a clean shield mark, never a sticker. The badge is the
 * *summary*; the criteria + "checked on" timestamp live on a tap-through
 * verification page (see VerifiedFactRow). Green is reserved EXCLUSIVELY for
 * register-verified states — we never imply more than we checked.
 */

export type VerifiedBadgeLevel = 'verified' | 'partial' | 'unverified';

const LEVELS: Record<
  VerifiedBadgeLevel,
  { icon: typeof faShieldCheck; label: string; classes: string }
> = {
  verified: {
    icon: faShieldCheck,
    label: 'Verified',
    classes: 'bg-verified-muted text-verified border-verified/20',
  },
  partial: {
    icon: faShieldHalved,
    label: 'Partly verified',
    classes: 'bg-aging-muted text-aging border-aging/20',
  },
  unverified: {
    icon: faShield,
    label: 'Self-declared',
    classes: 'bg-muted text-muted-foreground border-border',
  },
};

type VerifiedBadgeProps = {
  level: VerifiedBadgeLevel;
  /** Override the default label (e.g. "Identity verified"). */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
};

const VerifiedBadge = ({
  level,
  label,
  size = 'md',
  className,
}: VerifiedBadgeProps) => {
  const cfg = LEVELS[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium tabular',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        cfg.classes,
        className,
      )}
    >
      <FontAwesomeIcon
        icon={cfg.icon}
        className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
      />
      {label ?? cfg.label}
    </span>
  );
};

export default VerifiedBadge;
