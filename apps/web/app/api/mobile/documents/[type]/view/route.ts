import type { ContractorDocType } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { getDocumentDownloadUrlForCaller } from '@/app/actions';
import { validateUpload } from '@/lib/documents/validate';
import { getMobileCaller } from '@/lib/mobile/auth';

// A short-lived presigned URL to VIEW one of the caller's own compliance documents
// (by ContractorDocType). View-only — compliance docs are third-party evidence and
// are never editable (docs/ir35-trust-model.md). Owner-scoped; bearer-auth.
export const runtime = 'nodejs';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { type } = await params;
  // Reuse the upload validator just to normalise/validate the type enum (size +
  // mime are irrelevant here, so pass a permissive pdf placeholder).
  const check = validateUpload({
    type,
    mimeType: 'application/pdf',
    size: 1,
  });
  if (!check.ok) {
    return NextResponse.json(
      { error: 'Invalid document type' },
      { status: 400 },
    );
  }

  const url = await getDocumentDownloadUrlForCaller(
    caller.userId,
    check.type as ContractorDocType,
  );
  if (!url) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json({ url });
};
