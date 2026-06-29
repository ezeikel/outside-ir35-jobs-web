/**
 * Canonical IR35 signal labels — the SINGLE source of truth for how a listing's
 * stated IR35 position is shown to users, everywhere (web cards, mobile cards,
 * email alerts, programmatic-SEO pages). Previously duplicated in three places
 * (job-dto.ts, components/trust/JobMeta.tsx, email/job-alert-copy.ts) which
 * drifted out of sync — including em-dashes in the email copy that violate the
 * project's no-em-dash rule. Keep ALL IR35 wording here.
 *
 * HONESTY (docs/ir35-trust-model.md): these are the CLIENT's attributed claim,
 * never a platform assertion. We never say "verified outside IR35". The "· per
 * client" / "· SDS issued" suffixes describe HOW the client substantiated the
 * outside position, not our judgement of it.
 *
 * No React / server-only imports here so it's importable from RN-facing DTOs,
 * email copy (unit-tested under Vitest), and client components alike.
 */

export type IR35Signal =
  | 'CLIENT_INTENDS_OUTSIDE'
  | 'SDS_ISSUED'
  | 'SMALL_CLIENT_EXEMPT'
  | 'CONTRACT_REVIEW_HELD'
  | 'UNKNOWN'
  | 'INSIDE';

// 'verified' = the client substantiated it (SDS / contract review); 'neutral' =
// the client states it but no substantiation surfaced; 'muted' = no outside
// claim. Tone is presentational only — it never upgrades a claim to an assertion.
export type IR35Tone = 'verified' | 'neutral' | 'muted';

export type IR35LabelMeta = {
  label: string;
  tone: IR35Tone;
};

export const IR35_LABEL_META: Record<IR35Signal, IR35LabelMeta> = {
  SDS_ISSUED: { label: 'Outside IR35 · SDS issued', tone: 'verified' },
  CONTRACT_REVIEW_HELD: {
    label: 'Outside IR35 · contract reviewed',
    tone: 'verified',
  },
  CLIENT_INTENDS_OUTSIDE: {
    label: 'Outside IR35 · per client',
    tone: 'neutral',
  },
  SMALL_CLIENT_EXEMPT: {
    label: 'Outside IR35 · small-client',
    tone: 'neutral',
  },
  UNKNOWN: { label: 'IR35 not stated', tone: 'muted' },
  INSIDE: { label: 'Inside IR35', tone: 'muted' },
};

/** The user-facing label for an IR35 signal, falling back to "IR35 not stated". */
export const ir35Label = (signal: string | null | undefined): string =>
  IR35_LABEL_META[(signal ?? 'UNKNOWN') as IR35Signal]?.label ??
  IR35_LABEL_META.UNKNOWN.label;

/** Flat label map (signal → label string) for consumers that only need text. */
export const IR35_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(IR35_LABEL_META).map(([signal, meta]) => [signal, meta.label]),
);

// Signals that mean the CLIENT has stated/supported an outside position. Used to
// decide whether to surface the attributed claim line (never an assertion).
export const OUTSIDE_LEANING_SIGNALS: IR35Signal[] = [
  'CLIENT_INTENDS_OUTSIDE',
  'SDS_ISSUED',
  'CONTRACT_REVIEW_HELD',
  'SMALL_CLIENT_EXEMPT',
];
