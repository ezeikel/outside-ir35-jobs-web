import { NextResponse } from 'next/server';
import { extractDocFacts } from '@/lib/documents/extract';
import { isInsuranceType, validateUpload } from '@/lib/documents/validate';
import { getMobileCaller } from '@/lib/mobile/auth';

// Read the structured facts (insurer / cover limit / expiry) off a compliance
// document so the contractor doesn't have to type them. A TRANSCRIPTION AID — the
// app pre-fills the upload form with these and the user CONFIRMS before saving;
// nothing is written here and nothing is "verified" (docs/ir35-trust-model.md).
//
// PRIVACY: extraction runs ONLY on INSURANCE certificates (PI/PL/EL). It must
// NEVER run on identity documents — right-to-work / passport / BRP — because that
// would transmit a passport number, photo and DOB to a third-party AI to read an
// expiry date that isn't worth that exposure. Identity docs still upload + store
// as a file; their expiry is typed by hand (and on-device OCR is the planned path
// for auto-filling those without anything leaving the phone). Bearer-auth.
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

  // HARD privacy gate: extraction runs ONLY on insurance certs. Identity docs
  // (right-to-work / passport / BRP) and everything else return empty facts and
  // are NEVER sent to the AI — the file is uploaded, but its bytes don't leave for
  // a third-party model. The client just skips the pre-fill and the user types any
  // expiry by hand.
  if (!isInsuranceType(check.type)) {
    return NextResponse.json({
      facts: { insurer: null, coverLimit: null, expiresAt: null },
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const facts = await extractDocFacts(buffer, file.type);
  return NextResponse.json({ facts });
};
