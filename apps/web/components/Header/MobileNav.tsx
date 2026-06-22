'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Public links shown to everyone.
const PUBLIC_LINKS = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/day-rates', label: 'Day rates' },
  { href: '/partners', label: 'IR35 insurance' },
  { href: '/blog', label: 'Blog' },
];

/**
 * The mobile (< md) navigation. The desktop header hides its nav + user menu on
 * small screens, and the old menu button did nothing — so phones had NO navigation
 * at all. This is a real disclosure: tap to open a full-width panel with the public
 * links + the right auth/role actions, and close on navigation.
 */
const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  // Lock body scroll while the panel is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const role = session?.role;
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <Button
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </Button>

      {open ? (
        <div className="fixed inset-x-0 top-[57px] z-20 border-b border-border bg-card p-4 shadow-lg">
          <nav>
            <ul className="flex flex-col gap-1 text-base">
              {PUBLIC_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="block rounded-md px-2 py-2 hover:bg-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}

              {role === 'JOB_POSTER' ? (
                <li>
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="block rounded-md px-2 py-2 hover:bg-accent"
                  >
                    Dashboard
                  </Link>
                </li>
              ) : null}
              {role === 'JOB_SEEKER' ? (
                <>
                  <li>
                    <Link
                      href="/profile"
                      onClick={close}
                      className="block rounded-md px-2 py-2 hover:bg-accent"
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/alerts"
                      onClick={close}
                      className="block rounded-md px-2 py-2 hover:bg-accent"
                    >
                      Alerts
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/premium"
                      onClick={close}
                      className="block rounded-md px-2 py-2 hover:bg-accent"
                    >
                      Premium
                    </Link>
                  </li>
                </>
              ) : null}
            </ul>
          </nav>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Button asChild onClick={close}>
              <Link href="/job/post">Post a job</Link>
            </Button>
            {status === 'loading' ? null : session?.user ? (
              <Button
                variant="ghost"
                onClick={() => {
                  close();
                  signOut();
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  close();
                  signIn('google');
                }}
              >
                Log in
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MobileNav;
