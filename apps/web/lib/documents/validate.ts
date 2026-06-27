import { ContractorDocType, DocStatus } from '@outside-ir35-jobs/db/types';

/**
 * Validation for contractor document uploads. Pure logic (no Prisma/Next) so it
 * can be unit-tested and reused by the upload server action. A silent bug here
 * means accepting a malicious/oversized file or rejecting a valid one, so it's
 * tested (see validate.test.ts).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Compliance-pack docs are PDFs or image scans/photos of certificates.
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_DOC_TYPES = Object.values(ContractorDocType);

export type UploadCandidate = {
  type: string;
  mimeType: string;
  size: number;
};

export type UploadValidation =
  | { ok: true; type: ContractorDocType }
  | { ok: false; error: string };

const isAllowedMime = (mime: string): mime is AllowedMimeType =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);

export const isDocType = (value: string): value is ContractorDocType =>
  (ALLOWED_DOC_TYPES as string[]).includes(value);

/**
 * A client-input upload error (bad type / mime / size / no file). HTTP callers
 * map this to 400; anything else (R2 outage, DB error) is a real 500. Lets the
 * mobile route distinguish "your file is wrong" from "we failed" instead of
 * masking every failure as a 400.
 */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Validate an upload candidate. Returns the narrowed ContractorDocType on success
 * or a human-readable error. Order: type → mime → size (cheapest checks first;
 * size last so we report the most specific problem before the heaviest one).
 */
export const validateUpload = (input: UploadCandidate): UploadValidation => {
  if (!input.type || !isDocType(input.type)) {
    return { ok: false, error: 'Unknown document type.' };
  }
  // CVs are NOT compliance-pack docs — they live in their own multi-version table
  // (ContractorCV) and go through the CV upload flow, not this one.
  if (input.type === ContractorDocType.CV) {
    return { ok: false, error: 'Upload CVs from the CV section.' };
  }

  if (!input.mimeType || !isAllowedMime(input.mimeType)) {
    return { ok: false, error: 'Upload a PDF, PNG, JPEG, or WebP file.' };
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: 'The file appears to be empty.' };
  }

  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'File must be 10 MB or smaller.' };
  }

  return { ok: true, type: input.type };
};

// File-only validation for a CV upload (mime + size; CV isn't a "doc type").
export const validateCvFile = (input: {
  mimeType: string;
  size: number;
}): { ok: true } | { ok: false; error: string } => {
  if (!input.mimeType || !isAllowedMime(input.mimeType)) {
    return { ok: false, error: 'Upload a PDF, PNG, JPEG, or WebP file.' };
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: 'The file appears to be empty.' };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'File must be 10 MB or smaller.' };
  }
  return { ok: true };
};

/* ------------------------------------------------------------------ *
 * Document lifecycle: metadata + expiry status.                       *
 * Pure logic shared by the upload/edit actions AND the expiry cron so *
 * the two can never disagree about a doc's status.                    *
 * ------------------------------------------------------------------ */

// Days before expiry that a doc starts showing as EXPIRING.
export const EXPIRY_WARN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const INSURANCE_TYPES: ContractorDocType[] = [
  ContractorDocType.PI_INSURANCE,
  ContractorDocType.PL_INSURANCE,
  ContractorDocType.EL_INSURANCE,
];

// Insurance certs carry insurer + cover limit + expiry.
export const isInsuranceType = (type: string): boolean =>
  (INSURANCE_TYPES as string[]).includes(type);

// Types that carry an expiry date: insurance certs, plus right-to-work
// (time-limited visas). Right-to-work has no insurer/cover.
export const tracksExpiry = (type: string): boolean =>
  isInsuranceType(type) || type === ContractorDocType.RIGHT_TO_WORK;

/**
 * Parse a cover-limit form value to whole pounds. Returns null for blank /
 * non-numeric / non-positive input (so the column stays null rather than 0).
 */
export const parseCoverLimit = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
};

/**
 * Parse an expiry form value (e.g. an <input type="date"> string) to a Date.
 * Returns null for blank / unparseable input.
 */
export const parseExpiry = (raw: unknown): Date | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * The single source of truth for a document's lifecycle status, derived from its
 * expiry. Used by the upload/edit actions (on write) and the daily cron sweep.
 *
 * - no expiry            → ON_FILE  (e.g. CV, incorporation, or insurance with
 *                                    expiry not yet entered)
 * - expiry > warn window → ON_FILE
 * - within warn window   → EXPIRING
 * - on/after expiry      → FAILED   (expired — no longer valid cover)
 *
 * `now` is injected so it's deterministic in tests and consistent within a sweep.
 */
export const computeDocStatus = (
  expiresAt: Date | null | undefined,
  now: Date,
  warnDays: number = EXPIRY_WARN_DAYS,
): DocStatus => {
  if (!expiresAt) return DocStatus.ON_FILE;

  const msLeft = expiresAt.getTime() - now.getTime();
  if (msLeft <= 0) return DocStatus.FAILED;
  if (msLeft <= warnDays * DAY_MS) return DocStatus.EXPIRING;
  return DocStatus.ON_FILE;
};
