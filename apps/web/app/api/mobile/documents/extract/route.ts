import { NextResponse } from 'next/server';
import { extractDocFacts } from '@/lib/documents/extract';
import { tracksExpiry, validateUpload } from '@/lib/documents/validate';
import { getMobileCaller } from '@/lib/mobile/auth';

// Read the structured facts (insurer / cover limit / expiry) off a compliance
// document so the contractor doesn't have to type them. A TRANSCRIPTION AID — the
// app pre-fills the upload form with these and the user CONFIRMS before saving;
// nothing is written here and nothing is "verified" (docs/ir35-trust-model.md).
// Only runs for expiry-tracking types (insurance / right-to-work). Bearer-auth.
export const runtime = 'nodejs';
// Allow a moment for the model to read the PDF.
export const maxDuration = 30;

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account first' },
      { status: 403 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const type = String(form?.get('type') ?? '');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Same validation as the real upload (size / mime / type), so we never feed the
  // model junk and the client can't probe with arbitrary files.
  const check = validateUpload({
    type,
    mimeType: file.type,
    size: file.size,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  // Only expiry-tracking docs carry insurer/cover/expiry worth extracting. For
  // others, return empty facts (the client just skips the pre-fill).
  if (!tracksExpiry(check.type)) {
    return NextResponse.json({
      facts: { insurer: null, coverLimit: null, expiresAt: null },
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const facts = await extractDocFacts(buffer, file.type);
  return NextResponse.json({ facts });
};
