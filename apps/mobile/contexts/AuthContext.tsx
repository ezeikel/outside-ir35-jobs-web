import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useQueryClient } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner-native";
import {
  type AuthUser,
  getAuthMe,
  type OAuthSignInResponse,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/api-auth";
import { clearSession, getSessionToken, setSession } from "@/lib/auth";
import { initializeRevenueCat } from "@/lib/revenuecat";

// App-wide auth state. Browsing is public; this context is what unlocks the
// authed surfaces (apply, alerts, premium). Sign-in is native Google / Apple →
// our server mints a session token stored in SecureStore. On boot we restore the
// session (if any) and validate it against /api/mobile/auth/me.

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signInWithGoogleHandler: () => Promise<OAuthSignInResponse | null>;
  signInWithAppleHandler: () => Promise<OAuthSignInResponse | null>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  signInWithGoogleHandler: async () => null,
  signInWithAppleHandler: async () => null,
  signOut: async () => undefined,
  refreshAuth: async () => undefined,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Configure the Google SDK once. webClientId is the OAuth Web client (the one
  // that mints the idToken our server verifies); iosClientId is the native iOS
  // client. Both come from EXPO_PUBLIC_* env (set per build).
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // Restore + validate the stored session on boot.
  const refreshAuth = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await getAuthMe();
      setUser(me);
    } catch {
      // Token invalid/expired — clear it so the UI shows signed-out.
      await clearSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshAuth().finally(() => setIsLoading(false));
  }, [refreshAuth]);

  // Anchor RevenueCat to the DB user id so a mobile purchase keys to that user
  // (the RC webhook reconciles by app_user_id = userId). Re-runs when the signed-
  // in user changes; configures anonymously when signed out so the paywall can
  // still load offerings. No-ops cleanly if no RC key is set yet.
  useEffect(() => {
    void initializeRevenueCat(user?.id);
  }, [user?.id]);

  const finishSignIn = useCallback(
    async (res: OAuthSignInResponse) => {
      await setSession(res.sessionToken, res.user.id);
      setUser(res.user);
      // Authed data (applications, saved searches, premium) must refetch now
      // that we have a session.
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const signInWithGoogleHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken;
        if (!idToken) throw new Error("No ID token returned from Google");
        const res = await signInWithGoogle(idToken);
        await finishSignIn(res);
        return res;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Couldn't sign in with Google";
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [finishSignIn]);

  const signInWithAppleHandler =
    useCallback(async (): Promise<OAuthSignInResponse | null> => {
      try {
        setIsLoading(true);
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          ],
        });
        if (!credential.identityToken) {
          throw new Error("No identity token returned from Apple");
        }
        const res = await signInWithApple(credential.identityToken, {
          givenName: credential.fullName?.givenName ?? undefined,
          familyName: credential.fullName?.familyName ?? undefined,
        });
        await finishSignIn(res);
        return res;
      } catch (error: unknown) {
        // User-cancelled Apple sheet throws ERR_REQUEST_CANCELED — stay quiet.
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ERR_REQUEST_CANCELED"
        ) {
          return null;
        }
        const message =
          error instanceof Error ? error.message : "Couldn't sign in with Apple";
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [finishSignIn]);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    try {
      await GoogleSignin.signOut();
    } catch {
      // best-effort — local session is already cleared
    }
    void queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!user,
        user,
        signInWithGoogleHandler,
        signInWithAppleHandler,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
