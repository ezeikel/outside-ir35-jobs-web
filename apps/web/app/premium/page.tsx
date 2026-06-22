import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMySubscription } from '@/app/actions';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Premium from '@/components/Premium/Premium';
import { isPremium } from '@/lib/contractor/premium';

export const metadata: Metadata = {
  title: 'Premium — Outside IR35 Jobs',
  description:
    'A business tool for limited-company contractors: unlimited job alerts, full day-rate data and profile prominence.',
};

const PremiumPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) => {
  const session = await auth();
  if (!session?.userId) redirect('/api/auth/signin');
  if (session.role !== 'JOB_SEEKER') redirect('/jobs');

  const sub = await getMySubscription();
  const { status } = await searchParams;

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <Premium
          isActive={isPremium(sub)}
          status={sub?.status ?? null}
          currentPeriodEnd={sub?.currentPeriodEnd ?? null}
          cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
          checkoutStatus={status ?? null}
        />
      </div>
    </PageWrap>
  );
};

export default PremiumPage;
