import 'server-only';
import { db as prisma } from '@outside-ir35-jobs/db';
import { fulfilJobPayment } from '@/app/actions';

/**
 * Publish a job paid for on MOBILE via a RevenueCat one-time purchase. Called by
 * the RC webhook for a NON_RENEWING_PURCHASE of a job-post product — the mobile
 * equivalent of the Stripe checkout webhook flipping a web post live.
 *
 * Unlike Stripe (which carries the jobId in session metadata), the RC event only
 * gives us the buyer (app_user_id) + the store transaction id. So we reconcile by
 * the buyer's MOST-RECENT PENDING native job: the mobile flow creates the unpaid
 * job and immediately purchases, so the newest pending job for that user is the
 * one being paid for. The transaction id is stored for idempotency — RC delivers
 * at-least-once, and we never double-publish or attach the same transaction to
 * two jobs.
 *
 * Fulfilment itself (PAID + isActive + embed + revalidate) reuses the SAME
 * fulfilJobPayment the Stripe path uses, so the two providers publish identically.
 */
export const publishPaidJob = async ({
  userId,
  transactionId,
}: {
  userId: string;
  transactionId: string;
}): Promise<{
  status: 'published' | 'already_processed' | 'no_pending_job';
}> => {
  // Idempotency: if this transaction already reconciled to a job, do nothing.
  const existing = await prisma.job.findUnique({
    where: { revenueCatTransactionId: transactionId },
    select: { id: true },
  });
  if (existing) return { status: 'already_processed' };

  // The buyer's newest unpaid native post.
  const pending = await prisma.job.findFirst({
    where: {
      userId,
      paymentStatus: 'PENDING',
      source: 'NATIVE',
      revenueCatTransactionId: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!pending) return { status: 'no_pending_job' };

  // Stamp the transaction id first so a retry of this same event short-circuits
  // on the idempotency lookup above (the unique constraint also guards against a
  // race attaching one transaction to two jobs).
  await prisma.job.update({
    where: { id: pending.id },
    data: { revenueCatTransactionId: transactionId },
  });

  // Reuse the shared fulfilment (PAID + isActive + embed + revalidate).
  await fulfilJobPayment(pending.id);

  return { status: 'published' };
};
