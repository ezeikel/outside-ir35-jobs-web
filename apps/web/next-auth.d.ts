// types/next-auth.d.ts

import { Role } from '@outside-ir35-jobs/db/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    userId?: string;
    // null until the user picks a role at onboarding (role is nullable in the DB).
    role?: Role | null;
    // true once onboardedAt is set — used to gate /profile, /onboarding, etc.
    onboarded?: boolean;
  }
}
