// Pure copy/label helpers for the job-alert email. NO React Email imports here, so
// this stays unit-testable (importing @react-email/render under Vitest's React 19
// env throws on a React internal). The HTML rendering lives in job-alert.ts.

// Server-safe human labels for a listing's stated IR35 position. Phrased as the
// client's claim (never our judgement) — mirrors the board's chip language.
export const IR35_SIGNAL_LABEL: Record<string, string> = {
  CLIENT_INTENDS_OUTSIDE: 'Outside (client states)',
  SDS_ISSUED: 'Outside — SDS issued',
  CONTRACT_REVIEW_HELD: 'Outside — contract review held',
  SMALL_CLIENT_EXEMPT: 'Small client — self-determined',
  UNKNOWN: 'IR35 not stated',
  INSIDE: 'Inside IR35',
};

// The email subject line, pluralised by count.
export const jobAlertSubject = (count: number, searchLabel: string): string =>
  count === 1
    ? `1 new outside-IR35 contract for "${searchLabel}"`
    : `${count} new outside-IR35 contracts for "${searchLabel}"`;
