import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { Role, db as prisma } from '@outside-ir35/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        const existingUser = profile?.email
          ? await prisma.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          return true;
        }

        await prisma.user.create({
          data: {
            email: profile?.email as string,
            name: profile?.name as string,
            // TODO: default to job seeker for now but should be via button in UI?
            role: Role.JOB_SEEKER,
          },
        }); // create a new user with these details
        return true;
      }

      // TODO: handle other providers
      return false;
    },
    async session({ session, token }) {
      const dbUser = token.email
        ? await prisma.user.findUnique({
            where: { email: token.email },
          })
        : null;

      // eslint-disable-next-line no-param-reassign
      session.userId = dbUser?.id as string;
      return session;
    },
  },
  // Auth.js v5 reads AUTH_SECRET by default; keep NEXT_AUTH_SECRET as a fallback
  // for the existing env var name.
  secret: process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET,
});
