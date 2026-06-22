import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Providers from "@/providers";
import "@/global.css";

// Root layout: app-wide providers + a Stack. Tabs live under (tabs); detail
// screens (job/[id]) push on top with a header. Light UI only (matches web).
const RootLayout = () => (
  <Providers>
    <StatusBar style="dark" />
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f6f5f3" },
      }}
    >
      <Stack.Screen name="(tabs)" />
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
