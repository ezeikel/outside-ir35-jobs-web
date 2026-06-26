import { InterTight_600SemiBold } from "@expo-google-fonts/inter-tight";
import notifee, { EventType } from "@notifee/react-native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Providers from "@/providers";
import "@/global.css";

// Hold the splash until fonts are ready so the UI doesn't flash system-font text
// (the tab bar uses InterTight-SemiBold — the web app's brand font).
void SplashScreen.preventAutoHideAsync();

// Deep-links a notification tap to its `data.url`. Handles a cold-start tap (the
// app was killed → getInitialNotification) and a foreground tap (onForegroundEvent).
// Background taps are resurfaced as the initial notification on next launch.
const NotificationRouter = () => {
  const router = useRouter();

  useEffect(() => {
    const go = (url?: unknown) => {
      if (typeof url === "string" && url.length > 0) {
        // expo-router accepts our app paths (e.g. "/(tabs)/alerts", "/job/123").
        router.push(url as never);
      }
    };

    void notifee.getInitialNotification().then((initial) => {
      go(initial?.notification.data?.url);
    });

    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) go(detail.notification?.data?.url);
    });
    return unsub;
  }, [router]);

  return null;
};

// Sends a signed-in-but-not-onboarded user to the role picker. Runs inside
// Providers so useAuth is available. Browsing while signed-out is fine — the gate
// only fires once a session exists without a role.
const OnboardingGate = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user && !user.onboarded && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  return null;
};

// Root layout: app-wide providers + a Stack. Tabs live under (tabs); detail +
// modal screens push on top. Light UI only (matches web).
const RootLayout = () => {
  // The family name "InterTight-SemiBold" matches the fontFamily the tab bar
  // (and any future branded text) references.
  const [fontsLoaded] = useFonts({ "InterTight-SemiBold": InterTight_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Providers>
      <StatusBar style="dark" />
      <OnboardingGate />
      <NotificationRouter />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f6f5f3" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="job/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Contracts",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </Providers>
  );
};

export default RootLayout;
