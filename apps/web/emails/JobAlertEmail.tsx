import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import EmailButton from './EmailButton';
import EmailFooter from './EmailFooter';
import EmailHeader from './EmailHeader';
import { COLORS, card, container, main } from './styles';

export type AlertJob = {
  id: string;
  position: string;
  companyName: string;
  dayRate: number[]; // [min] or [min,max]
  location: string | null;
  ir35Label: string; // listing's stated IR35 position (client's claim)
};

export type JobAlertEmailProps = {
  jobs: AlertJob[];
  searchLabel: string;
  siteUrl: string;
  manageUrl: string;
};

const fmtRate = (dayRate: number[]): string => {
  if (!dayRate || dayRate.length === 0) return 'Rate not stated';
  const f = (n: number) => `£${n.toLocaleString('en-GB')}`;
  return dayRate.length >= 2
    ? `${f(dayRate[0])}–${f(dayRate[dayRate.length - 1])}/day`
    : `${f(dayRate[0])}/day`;
};

const jobBox = {
  padding: '16px 0',
  borderBottom: `1px solid ${COLORS.border}`,
};
const jobTitle = {
  color: COLORS.ink,
  fontSize: '17px',
  fontWeight: '600',
  textDecoration: 'none',
  margin: '0',
};
const jobCompany = {
  color: COLORS.inkMuted,
  fontSize: '14px',
  margin: '2px 0 0 0',
};
const jobMeta = {
  color: COLORS.inkFaint,
  fontSize: '13px',
  margin: '6px 0 0 0',
};

const DISCLAIMER =
  'We surface what each client states about IR35 — we never determine or guarantee a role’s IR35 status.';

const JobAlertEmail = ({
  jobs,
  searchLabel,
  siteUrl,
  manageUrl,
}: JobAlertEmailProps) => {
  const count = jobs.length;
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${count} new outside-IR35 ${count === 1 ? 'contract' : 'contracts'} for “${searchLabel}”`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <EmailHeader
              eyebrow="New contracts"
              title={`${count} new ${count === 1 ? 'contract' : 'contracts'} matching your search`}
              subtitle={searchLabel}
            />

            {jobs.map((job) => {
              const meta = [fmtRate(job.dayRate), job.location, job.ir35Label]
                .filter(Boolean)
                .join(' · ');
              return (
                <Section key={job.id} style={jobBox}>
                  <Link href={`${siteUrl}/job/${job.id}`} style={jobTitle}>
                    {job.position}
                  </Link>
                  <Text style={jobCompany}>{job.companyName}</Text>
                  <Text style={jobMeta}>{meta}</Text>
                </Section>
              );
            })}

            <EmailButton href={`${siteUrl}/jobs`}>
              View all on the board
            </EmailButton>

            <EmailFooter manageUrl={manageUrl} disclaim={DISCLAIMER} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

JobAlertEmail.PreviewProps = {
  searchLabel: 'React · London · outside only',
  siteUrl: 'https://www.outsideir35.jobs',
  manageUrl: 'https://www.outsideir35.jobs/alerts',
  jobs: [
    {
      id: 'job1',
      position: 'Senior React Engineer',
      companyName: 'Acme Digital Ltd',
      dayRate: [550, 650],
      location: 'London',
      ir35Label: 'Outside (client states)',
    },
    {
      id: 'job2',
      position: 'Platform Engineer (Terraform/AWS)',
      companyName: 'Northwind Consulting',
      dayRate: [600],
      location: 'Remote',
      ir35Label: 'Outside — SDS issued',
    },
  ],
} as JobAlertEmailProps;

export default JobAlertEmail;
