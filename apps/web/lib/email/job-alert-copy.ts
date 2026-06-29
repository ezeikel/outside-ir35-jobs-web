// Pure copy/label helpers for the job-alert email. NO React Email imports here, so
// this stays unit-testable (importing @react-email/render under Vitest's React 19
// env throws on a React internal). The HTML rendering lives in job-alert.ts.

// Server-safe human labels for a listing's stated IR35 position. Re-exported from
// the canonical map (lib/ir35/labels.ts) so email + board + DTOs never drift.
export { IR35_LABELS as IR35_SIGNAL_LABEL } from '@/lib/ir35/labels';

// The email subject line, pluralised by count.
export const jobAlertSubject = (count: number, searchLabel: string): string =>
  count === 1
    ? `1 new outside-IR35 contract for "${searchLabel}"`
    : `${count} new outside-IR35 contracts for "${searchLabel}"`;
