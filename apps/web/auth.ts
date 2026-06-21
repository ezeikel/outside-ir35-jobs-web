import { db as prisma } from '@outside-ir35-jobs/db';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel auto-enables this, but a local `next start` (and the prod-build e2e
  // run) needs it set explicitly or every session lookup throws UntrustedHost.
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || !profile?.email) {
        return false;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        return true;
      }

      // First sign-in: create a provisional user with NO role. The user picks
      // contractor (JOB_SEEKER) vs hiring (JOB_POSTER) at /onboarding, which sets
      // role + onboardedAt via the setUserRole action. (name is required.)
      await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? '',
          role: null,
          onboardedAt: null,
        },
      });
      return true;
    },
    async session({ session, token }) {
      const dbUser = token.email
        ? await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, onboardedAt: true },
          })
        : null;

      /* eslint-disable no-param-reassign */
      session.userId = dbUser?.id as string;
      session.role = dbUser?.role ?? null;
      session.onboarded = !!dbUser?.onboardedAt;
      /* eslint-enable no-param-reassign */
      return session;
    },
  },
  // Auth.js v5 reads AUTH_SECRET by default; keep NEXT_AUTH_SECRET as a fallback
  // for the existing env var name.
  secret: process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET,
});
