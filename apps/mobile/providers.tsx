import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";
import { AuthProvider } from "@/contexts/AuthContext";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const Providers = ({ children }: { children: ReactNode }) => {
  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* QueryClientProvider must wrap AuthProvider (it calls
            useQueryClient) and BottomSheetProvider (sheets portal their content
            up, so any sheet rendering a query consumer needs the client above
            the host). */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BottomSheetProvider>
              {children}
              {/* Toast host — last so toasts render above any sheet. */}
              <Toaster />
            </BottomSheetProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  // PostHog only when configured (a missing key would crash the provider).
  if (!POSTHOG_KEY) return tree;
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{ host: POSTHOG_HOST }}
      autocapture={{ captureScreens: true, captureTouches: false }}
    >
      {tree}
    </PostHogProvider>
  );
};

export default Providers;
