import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMyJobsWithApplicants } from '@/app/actions';
import { auth } from '@/auth';
import Dashboard from '@/components/Dashboard/Dashboard';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Your jobs & applicants — outsideir35jobs.com',
};

const DashboardPage = async () => {
  const session = await auth();
  if (!session?.userId) redirect('/api/auth/signin');
  if (!session.onboarded) redirect('/onboarding');
  // Only posters have a jobs dashboard.
  if (session.role !== 'JOB_POSTER') redirect('/jobs');

  const jobs = await getMyJobsWithApplicants();

  return (
    <PageWrap>
      <Dashboard jobs={jobs} />
    </PageWrap>
  );
};

export default DashboardPage;
