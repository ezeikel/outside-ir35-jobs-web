import { format } from 'date-fns';
import {
  DOC_LABEL,
  type ParsedCvProfile,
} from '@/components/ContractorProfile/ContractorProfile';
import CvProfile from '@/components/ContractorProfile/CvProfile';
import {
  CompletenessRing,
  type ContractorTrustTier,
  DocStatusRow,
  type DocStatus as UiDocStatus,
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
type Document = {
  id: string;
  type: string;
  status: string;
  insurer: string | null;
  coverLimit: number | null;
  expiresAt: Date | string | null;
};
type ApplicantData = {
  name: string;
  trustTier: ContractorTrustTier;
  rightToWorkConfirmed: boolean;
  holdsIR35Insurance: boolean;
  ir35InsuranceProvider: string | null;
  limitedCompanies: Company[];
  documents: Document[];
  parsedProfile: unknown;
};

// Map the DB DocStatus enum to the UI primitive (same mapping as the contractor's
// own profile, so an employer sees identical status language).
const DOC_STATUS: Record<string, UiDocStatus> = {
  ON_FILE: 'on_file',
  EXPIRING: 'expiring',
  PENDING: 'pending',
  MISSING: 'missing',
  FAILED: 'failed',
};

const docDetail = (doc: Document): string | undefined => {
  const parts: string[] = [];
  if (doc.insurer) parts.push(doc.insurer);
  if (doc.coverLimit)
    parts.push(`£${(doc.coverLimit / 1_000_000).toFixed(0)}m`);
  if (doc.expiresAt) parts.push(`expires ${fmtDate(doc.expiresAt)}`);
  if (doc.status === 'PENDING') return 'checking';
  if (doc.status === 'MISSING') return 'not added';
  return parts.length ? parts.join(' · ') : undefined;
};

// Completeness = fraction of the expected pack on file (mirrors ContractorProfile).
const EXPECTED_DOCS = [
  'INCORPORATION',
  'PI_INSURANCE',
  'PL_INSURANCE',
  'RIGHT_TO_WORK',
  'CV',
];
const packCompleteness = (documents: Document[]): number => {
  const onFile = new Set(
    documents.filter((d) => d.status === 'ON_FILE').map((d) => d.type),
  );
  const got = EXPECTED_DOCS.filter((t) => onFile.has(t)).length;
  return Math.round((got / EXPECTED_DOCS.length) * 100);
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
  // Only show real documents (never the MISSING placeholders) in the read-only
  // employer view.
  const docs = applicant.documents.filter((d) => d.status !== 'MISSING');
  const packPct = packCompleteness(applicant.documents);

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

      {/* Compliance pack — the contractor's documents on file (insurance, incorp,
          right-to-work). Read-only for the employer: we surface what's on file and
          its status/expiry, never an IR35-status judgement. Same status language
          the contractor sees on their own profile. */}
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Compliance pack</p>
          {docs.length > 0 ? (
            <CompletenessRing percent={packPct} label="on file" size={48} />
          ) : null}
        </div>
        {docs.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No documents on file yet.
          </p>
        ) : (
          <>
            {docs.map((doc) => (
              <DocStatusRow
                key={doc.id}
                name={DOC_LABEL[doc.type] ?? doc.type}
                status={DOC_STATUS[doc.status] ?? 'pending'}
                detail={docDetail(doc)}
              />
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              Documents the applicant has on file. Statuses reflect the
              applicant’s uploads, not platform verification of IR35 status.
            </p>
          </>
        )}
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
