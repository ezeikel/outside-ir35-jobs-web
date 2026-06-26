import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
      <KeyboardProvider>
        <SafeAreaProvider>
        {/* QueryClientProvider must wrap AuthProvider (it calls
            useQueryClient) and BottomSheetProvider (sheets portal their content
            up, so any sheet rendering a query consumer needs the client above
            the host). */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BottomSheetProvider>
              {children}
              {/* Toast host — last so toasts render above any sheet. Brand-
                  styled: light surface, ink text, Inter Tight. ALL transient
                  feedback goes through sonner (no Alert.alert); destructive
                  confirms use ConfirmSheet. */}
              <Toaster
                position="top-center"
                offset={60}
                theme="light"
                toastOptions={{
                  style: {
                    backgroundColor: "#ffffff",
                    borderColor: "#e8e7e5",
                    borderWidth: 1,
                    borderRadius: 14,
                  },
                  titleStyle: {
                    fontFamily: "InterTight-SemiBold",
                    color: "#17181a",
                  },
                  descriptionStyle: {
                    fontFamily: "InterTight-Regular",
                    color: "#767370",
                  },
                }}
              />
            </BottomSheetProvider>
          </AuthProvider>
        </QueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
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
