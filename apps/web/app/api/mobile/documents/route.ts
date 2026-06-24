import { Role } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { uploadDocumentForUser } from '@/app/actions';
import { MAX_UPLOAD_BYTES, UploadError } from '@/lib/documents/validate';
import { getMobileCaller } from '@/lib/mobile/auth';

// Upload a compliance-pack document from mobile. Wraps the SAME upload core the
// web server action uses (validation, R2 put, upsert, CV-parse trigger, RTW flag,
// trust-tier recompute) — so the rules can't drift. Multipart body with fields:
// type (ContractorDocType), file, and optional insurer/coverLimit/expiresAt for
// expiry-tracking types. Contractor-only, bearer-auth.
export const runtime = 'nodejs';

// Reject grossly-oversized bodies before buffering. validateUpload is still the
// authoritative size gate (Content-Length can be spoofed/omitted), but this stops
// an obvious multi-hundred-MB body from being parsed into memory first. Allow a
// little multipart overhead over the file limit.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024; // 10 MB + 1 MB overhead

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (caller.role !== Role.JOB_SEEKER) {
    return NextResponse.json(
      { error: 'Only contractors can upload documents' },
      { status: 403 },
    );
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'File must be 10 MB or smaller.' },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart/form-data' },
      { status: 400 },
    );
  }

  try {
    const result = await uploadDocumentForUser(caller.userId, formData);
    return NextResponse.json(result);
  } catch (e) {
    // Only client-input problems (bad type/mime/size/no file) are 400s. A real
    // failure (R2 outage, DB error) must surface as a 500 so it reaches Sentry,
    // not be masked as the client's fault.
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
};
