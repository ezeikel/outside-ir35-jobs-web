import { api } from "@/lib/api";

// Auth API calls. Each posts a native-SDK OAuth token to a /api/mobile/auth/*
// route on the web app; the server verifies the token, upserts the user (the
// same logic NextAuth's signIn callback uses), mints a mobile session token, and
// returns it. The client then stores {sessionToken,userId} in SecureStore.

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "JOB_SEEKER" | "JOB_POSTER" | null;
  onboarded: boolean;
};

export type OAuthSignInResponse = {
  sessionToken: string;
  user: AuthUser;
};

export const signInWithGoogle = async (
  idToken: string,
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>("/api/mobile/auth/google", {
    idToken,
  });
  return data;
};

export const signInWithApple = async (
  identityToken: string,
  name?: { givenName?: string; familyName?: string },
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>("/api/mobile/auth/apple", {
    identityToken,
    givenName: name?.givenName,
    familyName: name?.familyName,
  });
  return data;
};

/** Fetch the current user for the stored session token. 401 → signed out. */
export const getAuthMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<{ user: AuthUser }>("/api/mobile/auth/me");
  return data.user;
};
