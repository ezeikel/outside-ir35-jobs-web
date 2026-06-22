'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

// Client-side auth control for the header. Reads the SessionProvider context, so
// the Header itself stays a server component. The loading placeholder keeps the
// header from flashing while the session is fetched on first paint.
const UserMenu = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (!session?.user) {
    return (
      <Button variant="ghost" onClick={() => signIn('google')}>
        Log in
      </Button>
    );
  }

  // Posters get a link to their jobs-and-applicants dashboard; contractors get a
  // link to their saved-search job alerts.
  const isPoster = session.role === 'JOB_POSTER';
  const isContractor = session.role === 'JOB_SEEKER';

  return (
    <div className="flex items-center gap-2">
      {isPoster ? (
        <Link
          href="/dashboard"
          className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          Dashboard
        </Link>
      ) : null}
      {isContractor ? (
        <>
          <Link
            href="/alerts"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Alerts
          </Link>
          <Link
            href="/premium"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Premium
          </Link>
        </>
      ) : null}
      <Link
        href="/profile"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
      >
        {session.user.name || session.user.email}
      </Link>
      <Button variant="ghost" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
};

export default UserMenu;
