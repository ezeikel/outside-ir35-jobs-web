import { ContractorDocType } from '@outside-ir35-jobs/db/types';

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

const isDocType = (value: string): value is ContractorDocType =>
  (ALLOWED_DOC_TYPES as string[]).includes(value);

/**
 * Validate an upload candidate. Returns the narrowed ContractorDocType on success
 * or a human-readable error. Order: type → mime → size (cheapest checks first;
 * size last so we report the most specific problem before the heaviest one).
 */
export const validateUpload = (input: UploadCandidate): UploadValidation => {
  if (!input.type || !isDocType(input.type)) {
    return { ok: false, error: 'Unknown document type.' };
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
