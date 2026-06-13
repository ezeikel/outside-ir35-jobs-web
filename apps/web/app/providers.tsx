'use client';

import { SessionProvider } from 'next-auth/react';

// SessionProvider makes useSession() available to client components (UserMenu,
// the onboarding picker). No initial session is passed — it lazily fetches
// /api/auth/session on mount, which keeps the root layout static. The brief
// loading flash is handled by a neutral placeholder in UserMenu.
const Providers = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

export default Providers;
