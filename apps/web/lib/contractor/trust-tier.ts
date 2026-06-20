import {
  ContractorDocType,
  ContractorTrustTier,
  DocStatus,
} from '@outside-ir35-jobs/db/types';

/**
 * Compute a contractor's trust tier from objective, checkable state. Pure logic
 * (no Prisma/Next) so it's unit-tested and shared by every writer. Tiers are
 * STRICTLY CUMULATIVE — each requires all lower ones — matching the schema:
 *
 *   T0 SELF_DECLARED      default; nothing verified
 *   T1 IDENTITY_VERIFIED  a limited company passed Companies House AND VAT checks
 *   T2 DOCUMENTS_ON_FILE  T1 AND PI + PL + EL insurance certs on file
 *   T3 COMPLIANCE_CURRENT T2 AND every expected doc present + in-date AND
 *                         right-to-work confirmed
 *
 * We NEVER assert IR35 status here — tiers are facts about what we've checked,
 * not claims about a role's IR35 position.
 */

// The pack required for COMPLIANCE_CURRENT (matches the profile completeness ring).
export const EXPECTED_DOC_TYPES: ContractorDocType[] = [
  ContractorDocType.INCORPORATION,
  ContractorDocType.PI_INSURANCE,
  ContractorDocType.PL_INSURANCE,
  ContractorDocType.RIGHT_TO_WORK,
  ContractorDocType.CV,
];

// Insurance certs required for DOCUMENTS_ON_FILE.
const INSURANCE_DOC_TYPES: ContractorDocType[] = [
  ContractorDocType.PI_INSURANCE,
  ContractorDocType.PL_INSURANCE,
  ContractorDocType.EL_INSURANCE,
];

export type TrustTierDoc = {
  type: ContractorDocType | string;
  status: DocStatus | string;
};

export type TrustTierCompany = {
  companyVerifiedAt: Date | string | null;
  vatVerifiedAt: Date | string | null;
};

export type TrustTierState = {
  companies: TrustTierCompany[];
  documents: TrustTierDoc[];
  rightToWorkConfirmed: boolean;
};

// A doc "counts" as held + valid only when on file and not expiring/expired/failed.
const isCurrent = (status: DocStatus | string): boolean =>
  status === DocStatus.ON_FILE;

const hasType = (
  docs: TrustTierDoc[],
  type: ContractorDocType,
  requireCurrent: boolean,
): boolean =>
  docs.some((d) => d.type === type && (!requireCurrent || isCurrent(d.status)));

export const computeTrustTier = (
  state: TrustTierState,
): ContractorTrustTier => {
  // T1: at least one company verified on both Companies House and VAT.
  const identityVerified = state.companies.some(
    (c) => !!c.companyVerifiedAt && !!c.vatVerifiedAt,
  );
  if (!identityVerified) return ContractorTrustTier.SELF_DECLARED;

  // T2: all three insurance certs on file (presence; currency is checked at T3).
  const documentsOnFile = INSURANCE_DOC_TYPES.every((t) =>
    hasType(state.documents, t, false),
  );
  if (!documentsOnFile) return ContractorTrustTier.IDENTITY_VERIFIED;

  // T3: every expected doc present AND in-date, plus right-to-work confirmed.
  const complianceCurrent =
    state.rightToWorkConfirmed &&
    EXPECTED_DOC_TYPES.every((t) => hasType(state.documents, t, true));
  if (!complianceCurrent) return ContractorTrustTier.DOCUMENTS_ON_FILE;

  return ContractorTrustTier.COMPLIANCE_CURRENT;
};
