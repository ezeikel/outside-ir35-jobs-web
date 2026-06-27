import { NextResponse } from 'next/server';
import { createJobPaymentIntentForUser } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// Native Stripe Payment Sheet for a mobile job posting. Returns the PaymentIntent
// client secret + customer + ephemeral key + publishable key so the app can show
// the in-app card sheet (company card + VAT invoice, no Apple cut). The webhook
// (payment_intent.succeeded) publishes the job. Owner-scoped via the action.
export const runtime = 'nodejs';

export const POST = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const intent = await createJobPaymentIntentForUser(caller.userId, id);
    return NextResponse.json(intent);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not start payment';
    // "Job not found" / "not awaiting payment" are client errors (400); the
    // Stripe-config errors are 500s, but surfacing the message is enough here.
    return NextResponse.json({ error: msg }, { status: 400 });
  }
};
