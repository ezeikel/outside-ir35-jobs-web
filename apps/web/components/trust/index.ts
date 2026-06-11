// Register design system — trust primitives (the verification moat).
// See docs/design-system.md and docs/ir35-trust-model.md.

export { default as AttributedClaim } from './AttributedClaim';
export type { DocStatus } from './Completeness';
export { CompletenessRing, DocStatusRow } from './Completeness';
export type { JobListCardData } from './JobListCard';
export { default as JobListCard } from './JobListCard';
export type { JobIR35Signal, WorkMode } from './JobMeta';
export {
  ContractLengthPill,
  DayRatePill,
  IR35SignalChip,
  MetaPill,
  WorkModePill,
} from './JobMeta';
export type { ContractorTrustTier } from './TrustTierBar';
export { default as TrustTierBar } from './TrustTierBar';
export type { VerifiedBadgeLevel } from './VerifiedBadge';
export { default as VerifiedBadge } from './VerifiedBadge';
export type { FactStatus } from './VerifiedFactRow';
export { default as VerifiedFactRow } from './VerifiedFactRow';
