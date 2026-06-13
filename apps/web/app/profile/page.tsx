import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getContractorProfile } from '@/app/actions';
import { auth } from '@/auth';
import ContractorProfile, {
  type ContractorProfileData,
} from '@/components/ContractorProfile/ContractorProfile';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Your verified contractor profile',
};

const ProfilePage = async () => {
  const session = await auth();

  // Must be signed in; unonboarded users go pick a role first.
  if (!session?.userId) {
    redirect('/api/auth/signin');
  }
  if (!session.onboarded) {
    redirect('/onboarding');
  }

  // Session-scoped: returns null for posters or contractors with no data yet.
  const profile = await getContractorProfile();

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl">Build your verified profile</h1>
        <p className="mt-2 text-muted-foreground">
          Verify your company once and stop re-sending the same compliance pack
          to every agency.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Get started</Link>
        </Button>
      </div>
    );
  }

  // The Prisma result already matches ContractorProfileData's shape.
  return <ContractorProfile data={profile as ContractorProfileData} />;
};

export default ProfilePage;
