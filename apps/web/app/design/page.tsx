import type { Metadata } from 'next';
import {
  AttributedClaim,
  CompletenessRing,
  ContractLengthPill,
  DayRatePill,
  DocStatusRow,
  IR35SignalChip,
  JobListCard,
  type JobListCardData,
  TrustTierBar,
  VerifiedBadge,
  VerifiedFactRow,
  WorkModePill,
} from '@/components/trust';

export const metadata: Metadata = {
  title: 'Design System — Register',
  robots: { index: false, follow: false },
};

const SAMPLE_JOBS: JobListCardData[] = [
  {
    id: '1',
    position: 'Senior React Engineer',
    companyName: 'Northwind Digital',
    location: 'London (Remote)',
    dayRate: [600, 700],
    ir35Signal: 'SDS_ISSUED',
    workMode: 'REMOTE',
    contractLengthDays: 180,
    postedLabel: '2h ago',
    source: 'NATIVE',
    href: '#',
  },
  {
    id: '2',
    position: 'Platform / DevOps Contractor',
    companyName: 'Meridian Bank',
    location: 'Manchester',
    dayRate: [550],
    ir35Signal: 'CLIENT_INTENDS_OUTSIDE',
    workMode: 'HYBRID',
    contractLengthDays: 270,
    postedLabel: '1d ago',
    source: 'NATIVE',
    href: '#',
  },
  {
    id: '3',
    position: 'Data Engineer (Snowflake)',
    companyName: 'Acme Analytics',
    location: 'Leeds',
    dayRate: [500, 575],
    ir35Signal: 'UNKNOWN',
    workMode: 'ON_SITE',
    contractLengthDays: 90,
    postedLabel: '3d ago',
    source: 'AGGREGATED',
    href: '#',
  },
];

const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) => (
  <section className="border-t border-border py-10">
    <h2 className="font-display text-2xl">{title}</h2>
    {note && (
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">{note}</p>
    )}
    <div className="mt-6">{children}</div>
  </section>
);

const Swatch = ({ name, varName }: { name: string; varName: string }) => (
  <div className="flex flex-col gap-1.5">
    <div
      className="h-14 w-full rounded-md border border-border"
      style={{ background: `var(${varName})` }}
    />
    <div className="text-xs">
      <div className="font-medium text-foreground">{name}</div>
      <code className="text-muted-foreground">{varName}</code>
    </div>
  </div>
);

const DesignSystemPage = () => (
  <div className="mx-auto max-w-3xl px-6 py-12">
    {/* Masthead — the serif display moment */}
    <header className="pb-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Design System
      </p>
      <h1 className="mt-2 font-display text-5xl leading-none">Register</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Editorial-premium fintech. Ink authority anchor, forest-green reserved
        for verified states, attributed claims rendered as citations. Two faces:{' '}
        <span className="font-display">Instrument Serif</span> for display,
        Inter Tight for everything else.
      </p>
    </header>

    {/* Palette */}
    <Section
      title="Palette"
      note="Ink authority anchor; green ONLY for verified; amber for aging; one quiet ink-blue for links."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Swatch name="Ink 950 (anchor)" varName="--ink-950" />
        <Swatch name="Surface" varName="--background" />
        <Swatch name="Verified" varName="--verified" />
        <Swatch name="Aging" varName="--aging" />
        <Swatch name="Link" varName="--link" />
        <Swatch name="Muted" varName="--muted" />
        <Swatch name="Border" varName="--border" />
        <Swatch name="Destructive" varName="--destructive" />
      </div>
    </Section>

    {/* Type scale */}
    <Section title="Typography">
      <div className="space-y-3">
        <p className="font-display text-5xl leading-none">
          Display 5xl — Instrument Serif
        </p>
        <p className="font-display text-3xl">Heading 3xl — Instrument Serif</p>
        <p className="text-lg font-semibold">
          Body large semibold — Inter Tight
        </p>
        <p className="text-base">
          Body base — Inter Tight, the workhorse for all UI and data.
        </p>
        <p className="text-sm text-muted-foreground">
          Small muted — captions, timestamps, meta.
        </p>
        <p className="tabular text-base">
          Tabular figures · £600 · £1,250 · 87% · 14 Mar 2027
        </p>
      </div>
    </Section>

    {/* Verification badges + tiers */}
    <Section
      title="Trust signals"
      note="The moat. Green is earned, never implied. The platform never asserts IR35 status — only the client's attributed claim and checkable facts."
    >
      <div className="flex flex-wrap items-center gap-3">
        <VerifiedBadge level="verified" label="Compliance current" />
        <VerifiedBadge level="verified" label="Identity verified" />
        <VerifiedBadge level="partial" label="Docs on file" />
        <VerifiedBadge level="unverified" />
      </div>

      <div className="mt-8 max-w-md rounded-lg border border-border bg-card p-5">
        <p className="mb-3 text-sm font-medium">Contractor trust tier</p>
        <TrustTierBar current="DOCUMENTS_ON_FILE" />
      </div>
    </Section>

    {/* Attributed claim vs verified facts — the signature contrast */}
    <Section
      title="Attributed claim vs verified facts"
      note="A claim is the client's, on the record, with no green tick. A verified fact is checked against an official register, cited with a source and date."
    >
      <AttributedClaim
        claim="This role is intended to be outside IR35."
        attributedTo="Northwind Digital (client)"
        statedOn="11 Jun 2026"
        evidence="SDS attached"
      />
      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <p className="mb-1 text-sm font-medium">Verified facts</p>
        <VerifiedFactRow
          source="Companies House"
          fact="Northwind Digital Ltd — active"
          status="verified"
          checkedOn="11 Jun 2026"
        />
        <VerifiedFactRow
          source="HMRC VAT"
          fact="GB 123 4567 89 — valid"
          status="verified"
          checkedOn="11 Jun 2026"
        />
        <VerifiedFactRow
          source="Right to work"
          fact="Check pending"
          status="pending"
          checkedOn="—"
        />
      </div>
    </Section>

    {/* Job meta primitives */}
    <Section title="Job meta">
      <div className="flex flex-wrap items-center gap-4">
        <DayRatePill rate={[600, 700]} />
        <DayRatePill rate={[550]} unit="day" />
        <IR35SignalChip signal="SDS_ISSUED" />
        <IR35SignalChip signal="CLIENT_INTENDS_OUTSIDE" />
        <IR35SignalChip signal="UNKNOWN" />
        <WorkModePill mode="REMOTE" />
        <ContractLengthPill days={180} />
      </div>
    </Section>

    {/* Job list cards */}
    <Section
      title="Job list"
      note="List-leaning cards. Rates right-aligned and tabular; the client's IR35 signal sits in a quiet meta row."
    >
      <div className="space-y-3">
        {SAMPLE_JOBS.map((job) => (
          <JobListCard key={job.id} job={job} />
        ))}
      </div>
    </Section>

    {/* Profile completeness + docs */}
    <Section
      title="Verified profile"
      note="Build your compliance pack once. Honest per-document status; completeness as a first-class widget."
    >
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <CompletenessRing percent={72} label="Profile complete" />
          <VerifiedBadge level="verified" label="Identity verified" size="sm" />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium">Compliance pack</p>
          <DocStatusRow
            name="Certificate of incorporation"
            status="on_file"
            detail="verified 11 Jun 2026"
          />
          <DocStatusRow
            name="Professional Indemnity insurance"
            status="on_file"
            detail="£1m · expires 14 Mar 2027"
          />
          <DocStatusRow
            name="Public Liability insurance"
            status="expiring"
            detail="expires 02 Jul 2026"
          />
          <DocStatusRow
            name="Right to work"
            status="pending"
            detail="checking"
          />
          <DocStatusRow name="References" status="missing" detail="not added" />
        </div>
      </div>
    </Section>
  </div>
);

export default DesignSystemPage;
