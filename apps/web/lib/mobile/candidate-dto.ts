import 'server-only';
import type { ContractorTrustTier } from '@outside-ir35-jobs/db/types';

/**
 * Mobile-facing candidate card for the recruiter swipe deck. The poster shortlists
 * or passes on THEIR OWN applicants, on the OBJECTIVE, self-attested facts a
 * contractor put on their profile — never a platform score, ranking, or judgement
 * of the candidate (docs/ir35-trust-model.md). So the card carries only:
 *   - the trust TIER (a checkable status: which verifications passed), attributed
 *   - register-verified companies (Companies House / VAT), with verified dates
 *   - the contractor's OWN stated skills / headline / seniority (from their CV)
 *   - on-file compliance facts (insurance held, right-to-work confirmed)
 * and NEVER PII (email/phone/address) or a "match %".
 */

const TRUST_TIER_LABELS: Record<string, string> = {
  SELF_DECLARED: 'Self-declared',
  IDENTITY_VERIFIED: 'Identity verified',
  DOCUMENTS_ON_FILE: 'Documents on file',
  COMPLIANCE_CURRENT: 'Compliance current',
};

export type MobileCandidateCard = {
  applicationId: string;
  applicantId: string;
  // The application's triage state + when it was applied.
  status: 'NEW' | 'SHORTLISTED' | 'PASSED';
  appliedAt: string; // ISO
  message: string | null; // the contractor's optional cover note
  // Objective identity facts (never PII).
  name: string;
  trustTier: ContractorTrustTier;
  trustTierLabel: string;
  rightToWorkConfirmed: boolean;
  holdsIR35Insurance: boolean;
  // The contractor's OWN stated competency (from their parsed CV). Capped for the
  // card; the full profile is a follow-up screen.
  headline: string | null;
  seniority: string | null;
  yearsExperience: number | null;
  skills: string[];
  sectors: string[];
  // Register-verified companies (attributed facts, not our assertion).
  verifiedCompanies: { name: string; verifiedAt: string | null }[];
};

type ParsedProfileShape = {
  headline?: string | null;
  seniority?: string | null;
  yearsExperience?: number | null;
  skills?: string[];
  sectors?: string[];
};

export type CandidateRow = {
  applicationId: string;
  applicantId: string;
  status: 'NEW' | 'SHORTLISTED' | 'PASSED';
  appliedAt: Date | string;
  message: string | null;
  name: string | null;
  trustTier: ContractorTrustTier;
  rightToWorkConfirmed: boolean;
  holdsIR35Insurance: boolean;
  parsedProfile: unknown;
  verifiedCompanies: {
    name: string;
    companyVerifiedAt: Date | string | null;
  }[];
};

const SKILL_CAP = 8;

export const toMobileCandidateCard = (
  row: CandidateRow,
): MobileCandidateCard => {
  const profile = (row.parsedProfile ?? {}) as ParsedProfileShape;
  return {
    applicationId: row.applicationId,
    applicantId: row.applicantId,
    status: row.status,
    appliedAt: new Date(row.appliedAt).toISOString(),
    message: row.message,
    name: row.name ?? 'A contractor',
    trustTier: row.trustTier,
    trustTierLabel: TRUST_TIER_LABELS[row.trustTier] ?? 'Profile',
    rightToWorkConfirmed: row.rightToWorkConfirmed,
    holdsIR35Insurance: row.holdsIR35Insurance,
    headline: profile.headline ?? null,
    seniority: profile.seniority ?? null,
    yearsExperience: profile.yearsExperience ?? null,
    skills: (profile.skills ?? []).slice(0, SKILL_CAP),
    sectors: (profile.sectors ?? []).slice(0, SKILL_CAP),
    verifiedCompanies: row.verifiedCompanies.map((c) => ({
      name: c.name,
      verifiedAt: c.companyVerifiedAt
        ? new Date(c.companyVerifiedAt).toISOString()
        : null,
    })),
  };
};
