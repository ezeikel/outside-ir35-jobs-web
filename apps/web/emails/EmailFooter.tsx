import { Link, Section, Text } from '@react-email/components';
import { COLORS } from './styles';

const SITE = 'https://www.outsideir35jobs.com';

const footer = {
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: `1px solid ${COLORS.border}`,
};

const disclaimer = {
  color: COLORS.inkFaint,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 16px 0',
};

const links = { textAlign: 'center' as const, margin: '0 0 16px 0' };

const link = {
  color: COLORS.inkMuted,
  fontSize: '13px',
  textDecoration: 'none',
  margin: '0 10px',
};

const dot = { color: COLORS.border, fontSize: '13px' };

const manage = { textAlign: 'center' as const, margin: '0 0 16px 0' };

const manageLink = {
  color: COLORS.inkMuted,
  fontSize: '13px',
  textDecoration: 'underline',
};

const copyright = {
  color: COLORS.inkFaint,
  fontSize: '11px',
  textAlign: 'center' as const,
  lineHeight: '16px',
  margin: '0',
};

// `manageUrl` shows a per-email "manage/turn off" link (e.g. /alerts). `disclaim`
// lets a template carry the never-assert-IR35 line in the footer.
const EmailFooter = ({
  manageUrl,
  disclaim,
}: {
  manageUrl?: string;
  disclaim?: string;
} = {}) => (
  <Section style={footer}>
    {disclaim ? <Text style={disclaimer}>{disclaim}</Text> : null}

    <div style={links}>
      <Link href={`${SITE}/jobs`} style={link}>
        Jobs
      </Link>
      <span style={dot}>•</span>
      <Link href={`${SITE}/day-rates`} style={link}>
        Day rates
      </Link>
      <span style={dot}>•</span>
      <Link href={`${SITE}/privacy`} style={link}>
        Privacy
      </Link>
    </div>

    {manageUrl ? (
      <div style={manage}>
        <Link href={manageUrl} style={manageLink}>
          Manage or turn off these emails
        </Link>
      </div>
    ) : null}

    <Text style={copyright}>
      © {new Date().getFullYear()} Chewy Bytes Limited · outsideir35jobs.com
    </Text>
  </Section>
);

export default EmailFooter;
