// Shared styles for outsideir35jobs.com transactional emails. Mirrors the site's
// Register-editorial design: off-white canvas, white card, near-black ink, and
// forest-green (#1F5D43) reserved for verified/brand accents.

export const COLORS = {
  canvas: '#F6F5F3',
  card: '#FFFFFF',
  ink: '#1A1A1A',
  inkMuted: '#6B6B6B',
  inkFaint: '#9A9A9A',
  border: '#E5E3DF',
  verified: '#1F5D43',
};

export const main = {
  backgroundColor: COLORS.canvas,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

export const container = {
  margin: '0 auto',
  padding: '32px 16px',
  maxWidth: '560px',
};

export const card = {
  backgroundColor: COLORS.card,
  borderRadius: '12px',
  padding: '36px 32px',
  border: `1px solid ${COLORS.border}`,
};

export const eyebrow = {
  color: COLORS.inkMuted,
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px 0',
};

export const heading = {
  color: COLORS.ink,
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '30px',
  letterSpacing: '-0.4px',
  margin: '0 0 8px 0',
};

export const text = {
  color: '#444444',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

export const muted = {
  color: COLORS.inkMuted,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};
