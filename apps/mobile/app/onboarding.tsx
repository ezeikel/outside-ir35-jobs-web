import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { toast } from "sonner-native";
import OnboardingCarousel from "@/components/Onboarding/OnboardingCarousel";
import OnboardingPaywall from "@/components/Onboarding/OnboardingPaywall";
import { useAuth } from "@/contexts/AuthContext";
import { type OnboardingInput, submitOnboarding } from "@/lib/api-account";

// Onboarding entry. A swipeable carousel (value props → role picker) → for a
// contractor, a one-time paywall step (premium only applies to JOB_SEEKER;
// posters skip it) → into the app. The carousel slides are the "aha" that earns
// the paywall ask; "Maybe later" always continues free.
const OnboardingScreen = () => {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const enterApp = useCallback(() => router.replace("/(tabs)"), [router]);

  const onSubmitRole = async (input: OnboardingInput) => {
    setSubmitting(true);
    try {
      // Persist the role first so the user is onboarded regardless of what they
      // do at the paywall (purchase, restore, or skip).
      await submitOnboarding(input);
      await refreshAuth();
      if (input.role === "JOB_SEEKER") {
        setShowPaywall(true);
      } else {
        enterApp();
      }
    } catch {
      toast.error("Couldn’t save that — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (showPaywall) return <OnboardingPaywall onContinue={enterApp} />;

  return (
    <OnboardingCarousel submitting={submitting} onSubmitRole={onSubmitRole} />
  );
};

export default OnboardingScreen;
