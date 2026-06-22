import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Providers from "@/providers";
import "@/global.css";

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
const RootLayout = () => (
  <Providers>
    <StatusBar style="dark" />
    <OnboardingGate />
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

export default RootLayout;
