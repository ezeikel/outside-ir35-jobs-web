import 'server-only';

/**
 * Mobile-facing contractor-profile DTO. Surfaces the verified compliance pack as
 * objective, checkable facts — never an IR35 assertion (docs/ir35-trust-model.md).
 * Register checks are attributed with a timestamp; documents carry only a
 * "we hold this file" status + expiry. Mirrors the web profile's honesty model.
 */

// Trust tier labels — keep in sync with components/trust/TrustTierBar.tsx.
const TIER_LABELS: Record<string, { label: string; short: string }> = {
  SELF_DECLARED: { label: 'Self-declared', short: 'T0' },
  IDENTITY_VERIFIED: { label: 'Identity verified', short: 'T1' },
  DOCUMENTS_ON_FILE: { label: 'Documents on file', short: 'T2' },
  COMPLIANCE_CURRENT: { label: 'Compliance current', short: 'T3' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  INCORPORATION: 'Certificate of incorporation',
  VAT_CERTIFICATE: 'VAT certificate',
  PI_INSURANCE: 'Professional indemnity insurance',
  PL_INSURANCE: 'Public liability insurance',
  EL_INSURANCE: 'Employers’ liability insurance',
  RIGHT_TO_WORK: 'Right to work',
  CV: 'CV',
  OTHER: 'Other document',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  ON_FILE: 'On file',
  EXPIRING: 'Expiring soon',
  PENDING: 'Processing',
  MISSING: 'Not provided',
  FAILED: 'Check failed',
};

type CompanyRow = {
  id: string;
  name: string;
  vatNumber: string;
  incorporationNumber: string;
  companyVerifiedAt: Date | null;
  vatVerifiedAt: Date | null;
};

type DocumentRow = {
  id: string;
  type: string;
  status: string;
  insurer: string | null;
  coverLimit: number | null;
  expiresAt: Date | null;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  trustTier: string;
  holdsIR35Insurance: boolean;
  ir35InsuranceProvider: string | null;
  ir35InsuranceExpiry: Date | null;
  rightToWorkConfirmed: boolean;
  limitedCompanies: CompanyRow[];
  documents: DocumentRow[];
};

export type MobileProfile = {
  id: string;
  name: string;
  email: string;
  trustTier: string;
  trustTierLabel: string;
  trustTierShort: string;
  rightToWorkConfirmed: boolean;
  ir35Insurance: {
    held: boolean;
    provider: string | null;
    expiresAt: string | null;
  };
  companies: {
    id: string;
    name: string;
    vatNumber: string;
    incorporationNumber: string;
    // Attributed register checks — present only when the gov API confirmed it.
    companyVerifiedAt: string | null;
    vatVerifiedAt: string | null;
  }[];
  documents: {
    id: string;
    type: string;
    typeLabel: string;
    status: string;
    statusLabel: string;
    insurer: string | null;
    coverLimit: number | null;
    expiresAt: string | null;
  }[];
};

export const toMobileProfile = (row: ProfileRow): MobileProfile => {
  const tier = TIER_LABELS[row.trustTier] ?? TIER_LABELS.SELF_DECLARED;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    trustTier: row.trustTier,
    trustTierLabel: tier.label,
    trustTierShort: tier.short,
    rightToWorkConfirmed: row.rightToWorkConfirmed,
    ir35Insurance: {
      held: row.holdsIR35Insurance,
      provider: row.ir35InsuranceProvider,
      expiresAt: row.ir35InsuranceExpiry
        ? row.ir35InsuranceExpiry.toISOString()
        : null,
    },
    companies: row.limitedCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      vatNumber: c.vatNumber,
      incorporationNumber: c.incorporationNumber,
      companyVerifiedAt: c.companyVerifiedAt
        ? c.companyVerifiedAt.toISOString()
        : null,
      vatVerifiedAt: c.vatVerifiedAt ? c.vatVerifiedAt.toISOString() : null,
    })),
    documents: row.documents.map((d) => ({
      id: d.id,
      type: d.type,
      typeLabel: DOC_TYPE_LABELS[d.type] ?? d.type,
      status: d.status,
      statusLabel: DOC_STATUS_LABELS[d.status] ?? d.status,
      insurer: d.insurer,
      coverLimit: d.coverLimit,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    })),
  };
};
