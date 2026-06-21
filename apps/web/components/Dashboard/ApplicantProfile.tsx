import { format } from 'date-fns';
import type { ParsedCvProfile } from '@/components/ContractorProfile/ContractorProfile';
import CvProfile from '@/components/ContractorProfile/CvProfile';
import {
  type ContractorTrustTier,
  VerifiedBadge,
  VerifiedFactRow,
} from '@/components/trust';

const TIER_BADGE_LABEL: Record<ContractorTrustTier, string> = {
  SELF_DECLARED: 'Self-declared',
  IDENTITY_VERIFIED: 'Identity verified',
  DOCUMENTS_ON_FILE: 'Documents on file',
  COMPLIANCE_CURRENT: 'Compliance current',
};

const badgeLevel = (tier: ContractorTrustTier) =>
  tier === 'COMPLIANCE_CURRENT' || tier === 'IDENTITY_VERIFIED'
    ? 'verified'
    : tier === 'DOCUMENTS_ON_FILE'
      ? 'partial'
      : 'unverified';

const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'd MMM yyyy');
};

// The shape getApplicantProfile returns (Prisma user + companies + documents).
type Company = {
  id: string;
  name: string;
  vatNumber: string;
  incorporationNumber: string;
  companyVerifiedAt: Date | string | null;
  vatVerifiedAt: Date | string | null;
};
type ApplicantData = {
  name: string;
  trustTier: ContractorTrustTier;
  rightToWorkConfirmed: boolean;
  holdsIR35Insurance: boolean;
  ir35InsuranceProvider: string | null;
  limitedCompanies: Company[];
  parsedProfile: unknown;
};

/**
 * A poster's read-only view of an applicant's verified profile. Shows the same
 * checkable facts the contractor sees on their own profile (Companies House,
 * VAT, right-to-work, IR35 insurance) plus their self-reported CV profile. Honest
 * throughout: we surface what was verified against official registers and what
 * the contractor stated — never an IR35-status judgement.
 */
const ApplicantProfile = ({ applicant }: { applicant: ApplicantData }) => {
  const company = applicant.limitedCompanies[0];

  return (
    <div className="mt-4">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">
          {applicant.name}
        </h1>
        <VerifiedBadge
          level={badgeLevel(applicant.trustTier)}
          label={TIER_BADGE_LABEL[applicant.trustTier]}
        />
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <p className="mb-1 text-sm font-medium">Verified facts</p>
        {company ? (
          <>
            <VerifiedFactRow
              source="Companies House"
              fact={`${company.name} (no. ${company.incorporationNumber})`}
              status={company.companyVerifiedAt ? 'verified' : 'none'}
              checkedOn={fmtDate(company.companyVerifiedAt) || undefined}
            />
            <VerifiedFactRow
              source="HMRC VAT"
              fact={company.vatNumber}
              status={company.vatVerifiedAt ? 'verified' : 'none'}
              checkedOn={fmtDate(company.vatVerifiedAt) || undefined}
            />
          </>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No company on file.
          </p>
        )}
        <VerifiedFactRow
          source="Right to work"
          fact={applicant.rightToWorkConfirmed ? 'Confirmed' : 'Not confirmed'}
          status={applicant.rightToWorkConfirmed ? 'verified' : 'pending'}
        />
        {applicant.holdsIR35Insurance ? (
          <VerifiedFactRow
            source={applicant.ir35InsuranceProvider ?? 'IR35 cover'}
            fact="Active tax-investigation cover"
            status="verified"
          />
        ) : null}
      </section>

      {applicant.parsedProfile ? (
        <div className="mt-6">
          <CvProfile profile={applicant.parsedProfile as ParsedCvProfile} />
        </div>
      ) : null}
    </div>
  );
};

export default ApplicantProfile;
