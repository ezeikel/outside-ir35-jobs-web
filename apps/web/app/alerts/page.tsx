import { redirect } from 'next/navigation';
import { getMySavedSearches } from '@/app/actions';
import { auth } from '@/auth';
import SavedSearches from '@/components/Alerts/SavedSearches';
import PageWrap from '@/components/PageWrap/PageWrap';

const AlertsPage = async () => {
  const session = await auth();
  if (!session?.userId) redirect('/api/auth/signin');
  // Saved searches are a contractor feature.
  if (session.role !== 'JOB_SEEKER') redirect('/jobs');

  const searches = await getMySavedSearches();

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="font-display text-4xl leading-none sm:text-5xl">
            Job alerts
          </h1>
          <p className="mt-2 text-muted-foreground">
            Searches you’ve saved. We email you new outside-IR35 contracts that
            match — you can pause or delete any alert.
          </p>
        </header>
        <SavedSearches searches={searches} />
      </div>
    </PageWrap>
  );
};

export default AlertsPage;
