import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getApplicantProfile } from '@/app/actions';
import { auth } from '@/auth';
import ApplicantProfile from '@/components/Dashboard/ApplicantProfile';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Applicant profile — outsideir35.jobs',
};

type Params = { params: Promise<{ id: string }> };

const ApplicantPage = async ({ params }: Params) => {
  const session = await auth();
  if (!session?.userId) redirect('/api/auth/signin');
  if (session.role !== 'JOB_POSTER') redirect('/jobs');

  const { id } = await params;
  // Returns null unless this applicant applied to a job the poster owns.
  const applicant = await getApplicantProfile(id);
  if (!applicant) notFound();

  return (
    <PageWrap>
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to your jobs
        </Link>
        <ApplicantProfile applicant={applicant} />
      </div>
    </PageWrap>
  );
};

export default ApplicantPage;
