import { api } from "@/lib/api";

// Compliance-pack document upload/delete. Posts multipart to /api/mobile/documents
// (the bearer interceptor attaches the token). The server validates MIME + size +
// type, puts to R2, and recomputes the trust tier — mobile just sends the file.

// Mirror of the server's allow-list (apps/web/lib/documents/validate.ts) so the
// picker can filter + the UI can reject before a round-trip.
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Compliance-pack document types a contractor can upload, with labels. Mirrors
// ContractorDocType MINUS CV — CVs are multi-version now and upload via the CV
// flow (lib/api-cvs.ts), not the compliance-doc flow.
export const UPLOADABLE_DOC_TYPES = [
  { type: "INCORPORATION", label: "Certificate of incorporation", tracksExpiry: false },
  { type: "VAT_CERTIFICATE", label: "VAT certificate", tracksExpiry: false },
  { type: "PI_INSURANCE", label: "Professional indemnity insurance", tracksExpiry: true },
  { type: "PL_INSURANCE", label: "Public liability insurance", tracksExpiry: true },
  { type: "EL_INSURANCE", label: "Employers’ liability insurance", tracksExpiry: true },
  { type: "RIGHT_TO_WORK", label: "Right to work", tracksExpiry: true },
] as const;

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export type UploadMeta = {
  insurer?: string;
  coverLimit?: string;
  expiresAt?: string; // ISO date
};

export const uploadDocument = async (
  docType: string,
  file: PickedFile,
  meta?: UploadMeta,
): Promise<{ type: string; status: string }> => {
  const form = new FormData();
  form.append("type", docType);
  // RN multipart file part — the { uri, name, type } shape is what fetch/axios
  // turns into a real file upload on device. RN's FormData accepts this object,
  // but the DOM FormData type doesn't model it, so cast through unknown.
  const filePart = {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob;
  form.append("file", filePart);
  if (meta?.insurer) form.append("insurer", meta.insurer);
  if (meta?.coverLimit) form.append("coverLimit", meta.coverLimit);
  if (meta?.expiresAt) form.append("expiresAt", meta.expiresAt);

  const { data } = await api.post<{ type: string; status: string }>(
    "/api/mobile/documents",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
};

export const deleteDocument = async (docType: string): Promise<void> => {
  await api.delete(`/api/mobile/documents/${docType}`);
};

// Facts read off a document by AI (a transcription aid — the user confirms them
// before saving; nothing is verified). Cover limit is whole pounds; expiry is ISO.
export type ExtractedDocFacts = {
  insurer: string | null;
  coverLimit: number | null;
  expiresAt: string | null;
};

// Ask the server to read insurer / cover / expiry off a picked file so we can
// pre-fill the form. Best-effort: returns all-null on any failure so the user just
// types it in. Only meaningful for expiry-tracking types.
export const extractDocFacts = async (
  docType: string,
  file: PickedFile,
): Promise<ExtractedDocFacts> => {
  const form = new FormData();
  form.append("type", docType);
  const filePart = {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob;
  form.append("file", filePart);
  try {
    const { data } = await api.post<{ facts: ExtractedDocFacts }>(
      "/api/mobile/documents/extract",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.facts;
  } catch {
    return { insurer: null, coverLimit: null, expiresAt: null };
  }
};
