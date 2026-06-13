import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import OnboardingRolePicker from '@/components/Onboarding/OnboardingRolePicker';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Welcome — choose how you’ll use the platform',
};

const OnboardingPage = async () => {
  const session = await auth();

  // Must be signed in to onboard; already-onboarded users skip straight through.
  if (!session?.userId) {
    redirect('/api/auth/signin');
  }
  if (session.onboarded) {
    redirect('/profile');
  }

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
        <header className="mb-8">
          <h1 className="text-4xl leading-none">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            One quick question so we can set you up. You can change this later.
          </p>
        </header>
        <OnboardingRolePicker />
      </div>
    </PageWrap>
  );
};

export default OnboardingPage;
