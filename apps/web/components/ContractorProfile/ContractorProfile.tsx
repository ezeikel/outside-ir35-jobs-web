import {
  CompletenessRing,
  type ContractorTrustTier,
  DocStatusRow,
  TrustTierBar,
  type DocStatus as UiDocStatus,
  VerifiedBadge,
  VerifiedFactRow,
} from '@/components/trust';
import { tracksExpiry } from '@/lib/documents/validate';
import DocumentMetaForm from './DocumentMetaForm';
import DocumentUpload from './DocumentUpload';

/**
 * The verified contractor profile — the platform's moat made visible.
 * "Build your compliance pack once": trust tier, checkable facts (verified
 * against official registers), IR35 insurance, and per-document status. Honest
 * throughout — we only show what we actually checked (see ir35-trust-model.md).
 *
 * Read-only surface for now; editing / document upload / auth come next.
 */

type DbCompany = {
  name: string;
  vatNumber: string;
  incorporationNumber: string;
  companyVerifiedAt: Date | string | null;
  vatVerifiedAt: Date | string | null;
};

type DbDocument = {
  id: string;
  type: string;
  status: string;
  insurer: string | null;
  coverLimit: number | null;
  expiresAt: Date | string | null;
};

export type ContractorProfileData = {
  name: string;
  trustTier: ContractorTrustTier;
  holdsIR35Insurance: boolean;
  ir35InsuranceProvider: string | null;
  ir35InsuranceExpiry: Date | string | null;
  rightToWorkConfirmed: boolean;
  limitedCompanies: DbCompany[];
  documents: DbDocument[];
};

const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DOC_LABEL: Record<string, string> = {
  INCORPORATION: 'Certificate of incorporation',
  VAT_CERTIFICATE: 'VAT certificate',
  PI_INSURANCE: 'Professional Indemnity insurance',
  PL_INSURANCE: 'Public Liability insurance',
  EL_INSURANCE: "Employers' Liability insurance",
  RIGHT_TO_WORK: 'Right to work',
  CV: 'CV',
  OTHER: 'Document',
};

const DOC_STATUS: Record<string, UiDocStatus> = {
  ON_FILE: 'on_file',
  EXPIRING: 'expiring',
  PENDING: 'pending',
  MISSING: 'missing',
  FAILED: 'failed',
};

const docDetail = (doc: DbDocument): string | undefined => {
  const parts: string[] = [];
  if (doc.insurer) parts.push(doc.insurer);
  if (doc.coverLimit)
    parts.push(`£${(doc.coverLimit / 1_000_000).toFixed(0)}m`);
  if (doc.expiresAt) parts.push(`expires ${fmtDate(doc.expiresAt)}`);
  if (doc.status === 'PENDING') return 'checking';
  if (doc.status === 'MISSING') return 'not added';
  return parts.length ? parts.join(' · ') : undefined;
};

// Completeness = a simple, honest fraction of the expected pack on file.
const EXPECTED_DOCS = [
  'INCORPORATION',
  'PI_INSURANCE',
  'PL_INSURANCE',
  'RIGHT_TO_WORK',
  'CV',
];
const completeness = (p: ContractorProfileData): number => {
  const onFile = new Set(
    p.documents.filter((d) => d.status === 'ON_FILE').map((d) => d.type),
  );
  const got = EXPECTED_DOCS.filter((t) => onFile.has(t)).length;
  return Math.round((got / EXPECTED_DOCS.length) * 100);
};

const badgeLevel = (tier: ContractorTrustTier) =>
  tier === 'COMPLIANCE_CURRENT' || tier === 'IDENTITY_VERIFIED'
    ? 'verified'
    : tier === 'DOCUMENTS_ON_FILE'
      ? 'partial'
      : 'unverified';

const TIER_BADGE_LABEL: Record<ContractorTrustTier, string> = {
  SELF_DECLARED: 'Self-declared',
  IDENTITY_VERIFIED: 'Identity verified',
  DOCUMENTS_ON_FILE: 'Documents on file',
  COMPLIANCE_CURRENT: 'Compliance current',
};

const ContractorProfile = ({ data }: { data: ContractorProfileData }) => {
  const company = data.limitedCompanies[0];
  const pct = completeness(data);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">
            {data.name}
          </h1>
          {company && (
            <p className="mt-1 text-muted-foreground">{company.name}</p>
          )}
        </div>
        <VerifiedBadge
          level={badgeLevel(data.trustTier)}
          label={TIER_BADGE_LABEL[data.trustTier]}
        />
      </header>

      {/* Trust tier ladder */}
      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <p className="mb-3 text-sm font-medium">Trust tier</p>
        <TrustTierBar current={data.trustTier} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left: verified facts + insurance */}
        <div className="space-y-6">
          {company && (
            <section className="rounded-lg border border-border bg-card p-5">
              <p className="mb-1 text-sm font-medium">Verified facts</p>
              <VerifiedFactRow
                source="Companies House"
                fact={`${company.name} — active (no. ${company.incorporationNumber})`}
                status={company.companyVerifiedAt ? 'verified' : 'none'}
                checkedOn={fmtDate(company.companyVerifiedAt) || undefined}
              />
              <VerifiedFactRow
                source="HMRC VAT"
                fact={`${company.vatNumber} — valid`}
                status={company.vatVerifiedAt ? 'verified' : 'none'}
                checkedOn={fmtDate(company.vatVerifiedAt) || undefined}
              />
              <VerifiedFactRow
                source="Right to work"
                fact={data.rightToWorkConfirmed ? 'Confirmed' : 'Check pending'}
                status={data.rightToWorkConfirmed ? 'verified' : 'pending'}
              />
            </section>
          )}

          {data.holdsIR35Insurance && (
            <section className="rounded-lg border border-border bg-card p-5">
              <p className="mb-1 text-sm font-medium">IR35 insurance</p>
              <VerifiedFactRow
                source={data.ir35InsuranceProvider ?? 'IR35 cover'}
                fact="Active tax-investigation cover"
                status="verified"
                checkedOn={
                  data.ir35InsuranceExpiry
                    ? `expires ${fmtDate(data.ir35InsuranceExpiry)}`
                    : undefined
                }
              />
            </section>
          )}

          {/* Compliance pack */}
          <section className="rounded-lg border border-border bg-card p-5">
            <p className="mb-1 text-sm font-medium">Compliance pack</p>
            {data.documents.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No documents yet.
              </p>
            ) : (
              data.documents.map((doc) => (
                <div key={doc.id}>
                  <DocStatusRow
                    name={DOC_LABEL[doc.type] ?? doc.type}
                    status={DOC_STATUS[doc.status] ?? 'pending'}
                    detail={docDetail(doc)}
                  />
                  {tracksExpiry(doc.type) && (
                    <DocumentMetaForm
                      documentId={doc.id}
                      type={doc.type}
                      insurer={doc.insurer}
                      coverLimit={doc.coverLimit}
                      expiresAt={doc.expiresAt}
                    />
                  )}
                </div>
              ))
            )}
            <DocumentUpload />
          </section>
        </div>

        {/* Right: completeness */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
            <CompletenessRing percent={pct} label="Pack complete" size={88} />
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Build your pack once. Share it with one click — no more re-sending
              the same documents to every agency.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ContractorProfile;
