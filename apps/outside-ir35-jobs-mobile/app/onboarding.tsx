import { useRouter } from "expo-router";
import { useState } from "react";
import { toast } from "sonner-native";
import OnboardingCarousel from "@/components/Onboarding/OnboardingCarousel";
import { useAuth } from "@/contexts/AuthContext";
import { type OnboardingInput, submitOnboarding } from "@/lib/api-account";

// Onboarding entry. A swipeable carousel (value props → role picker); the role
// picker calls back here to persist the choice and continue into the app.
const OnboardingScreen = () => {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onSubmitRole = async (input: OnboardingInput) => {
    setSubmitting(true);
    try {
      await submitOnboarding(input);
      await refreshAuth();
      router.replace("/(tabs)");
    } catch {
      toast.error("Couldn’t save that — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingCarousel submitting={submitting} onSubmitRole={onSubmitRole} />
  );
};

export default OnboardingScreen;
