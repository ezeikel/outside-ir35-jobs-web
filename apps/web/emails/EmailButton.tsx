import { Button, Section } from '@react-email/components';
import { COLORS } from './styles';

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'verified';
};

const EmailButton = ({
  href,
  children,
  variant = 'primary',
}: EmailButtonProps) => {
  const base = {
    padding: '13px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '15px',
    display: 'inline-block',
    textAlign: 'center' as const,
  };
  const styles = {
    primary: { ...base, backgroundColor: COLORS.ink, color: '#FFFFFF' },
    verified: { ...base, backgroundColor: COLORS.verified, color: '#FFFFFF' },
  };
  return (
    <Section style={{ textAlign: 'center', margin: '24px 0 8px 0' }}>
      <Button href={href} style={styles[variant]}>
        {children}
      </Button>
    </Section>
  );
};

export default EmailButton;
