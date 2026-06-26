import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Paywall from "@/components/Paywall";
import { usePremium } from "@/lib/api-premium";

// The paywall step shown once, at the end of onboarding, AFTER a contractor has
// picked their role (the value props in the carousel are the "aha" that earns
// the ask — see the paywall playbook: value before ask, respect the no). It
// reuses the same honest Paywall the Premium tab uses, wrapped full-screen with
// a clear "Maybe later" escape. If the user is already premium (restored), we
// skip straight through. Hiring/poster roles never reach this step.

const OnboardingPaywall = ({ onContinue }: { onContinue: () => void }) => {
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();

  // If they already have premium (e.g. restored on this device), don't make them
  // sit on a paywall — continue into the app.
  useEffect(() => {
    if (isPremium) onContinue();
  }, [isPremium, onContinue]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <Text className="font-sans-medium text-sm uppercase tracking-wide text-muted-foreground">
            One last thing
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Paywall />
        </Animated.View>
      </ScrollView>

      {/* Escape hatch — pinned, always reachable, clearly "free is fine". */}
      <View
        className="absolute inset-x-0 bottom-0 bg-background px-6 pt-2"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          className="p-3 active:opacity-70"
          onPress={onContinue}
          accessibilityRole="button"
        >
          <Text className="text-center font-sans-semibold text-base text-muted-foreground">
            Maybe later
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default OnboardingPaywall;
