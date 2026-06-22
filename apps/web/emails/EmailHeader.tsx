import { Heading, Section, Text } from '@react-email/components';
import { COLORS } from './styles';

type EmailHeaderProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

const wrap = { padding: '0 0 8px 0' };

const wordmark = {
  color: COLORS.ink,
  // Display serif on-site; email-safe serif stack here.
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 24px 0',
};

const eyebrowStyle = {
  color: COLORS.inkMuted,
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px 0',
};

const titleStyle = {
  color: COLORS.ink,
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '30px',
  letterSpacing: '-0.4px',
  margin: '0 0 6px 0',
};

const subtitleStyle = {
  color: COLORS.inkMuted,
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
};

const divider = {
  width: '40px',
  height: '3px',
  backgroundColor: COLORS.verified,
  margin: '20px 0 0 0',
  borderRadius: '2px',
};

const EmailHeader = ({ eyebrow, title, subtitle }: EmailHeaderProps) => (
  <Section style={wrap}>
    <Text style={wordmark}>Outside IR35 Jobs</Text>
    {title ? (
      <>
        {eyebrow ? <Text style={eyebrowStyle}>{eyebrow}</Text> : null}
        <Heading style={titleStyle}>{title}</Heading>
        {subtitle ? <Text style={subtitleStyle}>{subtitle}</Text> : null}
        <div style={divider} />
      </>
    ) : null}
  </Section>
);

export default EmailHeader;
