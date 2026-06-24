import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Paywall from "@/components/Paywall";
import { useAuth } from "@/contexts/AuthContext";

// Premium tab: the paywall for contractors (and the active/manage state once
// subscribed). Signed-out → prompt to sign in; posters → not applicable.
const PremiumScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-muted-foreground">
          Sign in to go premium — unlimited alerts, full rate data, and AI
          match explanations.
        </Text>
        <Pressable
          className="mt-6 rounded-lg bg-primary px-5 py-3 active:opacity-90"
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Text className="font-sans-semibold text-primary-foreground">
            Sign in
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!isLoading && user?.role !== "JOB_SEEKER") {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-muted-foreground">
          Premium is a contractor feature.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Text className="mb-4 text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
        Premium
      </Text>
      <Paywall />
    </ScrollView>
  );
};

export default PremiumScreen;
