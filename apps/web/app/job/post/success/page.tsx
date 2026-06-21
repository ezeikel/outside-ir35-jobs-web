import { db as prisma } from '@outside-ir35-jobs/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import { Button } from '@/components/ui/button';

/**
 * Post-checkout return page. The Stripe redirect is NOT proof of payment — the
 * webhook publishes the job. We read the job's current paymentStatus from the DB:
 * if the webhook already landed it's PAID (live); otherwise it's still PENDING and
 * we tell the poster it'll go live momentarily. Either way we never publish here.
 */
const JobPostSuccessPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) => {
  const session = await auth();
  if (!session?.userId) redirect('/api/auth/signin');

  const { session_id: stripeSessionId } = await searchParams;

  const job = stripeSessionId
    ? await prisma.job.findUnique({
        where: { stripeSessionId },
        select: { id: true, position: true, paymentStatus: true, userId: true },
      })
    : null;

  // Only the owning poster sees their own post-payment status.
  const owned = job?.userId === session.userId;
  const paid = owned && job?.paymentStatus === 'PAID';

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-4xl leading-none">
          {paid ? 'Your contract is live' : 'Payment received'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          {!owned
            ? 'Thanks — your payment is being processed.'
            : paid
              ? `“${job?.position}” is now published and searchable on the board.`
              : 'Thanks. Your listing will go live within a few moments, once payment is confirmed.'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs">Browse contracts</Link>
          </Button>
        </div>
      </div>
    </PageWrap>
  );
};

export default JobPostSuccessPage;
