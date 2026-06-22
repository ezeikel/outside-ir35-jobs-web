import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfilJobPayment, syncSubscriptionFromStripe } from '@/app/actions';
import { getStripe } from '@/lib/stripe/client';

// Map a Stripe Subscription object → the shape syncSubscriptionFromStripe expects.
const subToSync = (sub: Stripe.Subscription) => ({
  userId: sub.metadata?.userId ?? null,
  stripeCustomerId:
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
  stripeSubscriptionId: sub.id,
  stripePriceId: sub.items.data[0]?.price?.id ?? null,
  status: sub.status,
  currentPeriodEnd: sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null,
  cancelAtPeriodEnd: sub.cancel_at_period_end,
});

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

  try {
    switch (event.type) {
      // A one-off job-posting checkout completed → publish the job. (Subscription
      // checkouts also fire this, but we sync those off customer.subscription.*
      // which carry status/period — so only act on mode=payment here.)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const jobId = session.metadata?.jobId ?? session.client_reference_id;
        if (
          session.mode === 'payment' &&
          session.payment_status === 'paid' &&
          jobId
        ) {
          await fulfilJobPayment(jobId);
        }
        break;
      }
      // Subscription lifecycle → sync our Subscription row (source of truth).
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subToSync(sub));
        break;
      }
      default:
        // Acked (200) and ignored.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries (handlers are idempotent).
    const message =
      err instanceof Error ? err.message : 'Webhook handler failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
};
