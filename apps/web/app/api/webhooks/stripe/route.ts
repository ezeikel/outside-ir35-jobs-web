import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfilJobPayment } from '@/app/actions';
import { getStripe } from '@/lib/stripe/client';

/**
 * Stripe webhook — the source of truth for "a native job posting was paid".
 * Integration boundary (per CLAUDE.md, webhooks live in routes, not actions): we
 * verify the signature, then delegate publishing to the fulfilJobPayment action.
 *
 * We MUST read the raw body for signature verification, so this route reads
 * request.text() (not .json()). STRIPE_WEBHOOK_SECRET is the signing secret of
 * this endpoint (test secret in dev, live secret in prod).
 */
export const POST = async (request: Request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 503 },
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    // Bad signature / malformed payload — reject so Stripe shows it as failed.
    const message = err instanceof Error ? err.message : 'Invalid payload';
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  // We only act on a completed checkout. Other events are acked (200) and ignored.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // The job is carried in metadata (set by createJobCheckoutSession), with
    // client_reference_id as a fallback.
    const jobId = session.metadata?.jobId ?? session.client_reference_id;
    // Only publish on a paid session (mode=payment sessions report payment_status).
    if (session.payment_status === 'paid' && jobId) {
      try {
        await fulfilJobPayment(jobId);
      } catch (err) {
        // Return 500 so Stripe retries (fulfilJobPayment is idempotent).
        const message =
          err instanceof Error ? err.message : 'Fulfilment failed';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
};
