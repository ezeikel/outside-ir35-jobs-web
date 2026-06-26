import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { toast } from "sonner-native";
import OnboardingCarousel from "@/components/Onboarding/OnboardingCarousel";
import OnboardingPaywall from "@/components/Onboarding/OnboardingPaywall";
import { useAuth } from "@/contexts/AuthContext";
import { type OnboardingInput, submitOnboarding } from "@/lib/api-account";
import { useOnboardingStore } from "@/stores/onboardingStore";

// First-launch onboarding (shown once, BEFORE sign-in). A value-prop carousel →
// "how will you use it?" role pick. Picking a role then prompts sign-in (Google/
// Apple) carrying the choice; after auth we persist the role and — for a
// contractor — show the one-time paywall. The user can also "Browse first" to
// skip straight into the board unsigned (sign-in is only needed later to apply /
// save / post). Either exit marks onboarding complete so it never shows again.
const OnboardingScreen = () => {
  const router = useRouter();
  const {
    isAuthenticated,
    refreshAuth,
    signInWithGoogleHandler,
    signInWithAppleHandler,
  } = useAuth();
  const complete = useOnboardingStore((s) => s.complete);
  const [submitting, setSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Mark onboarding seen + go to the board.
  const enterApp = useCallback(() => {
    complete();
    router.replace("/(tabs)");
  }, [complete, router]);

  // "Browse first" — skip sign-in, just explore the board.
  const onSkip = useCallback(() => enterApp(), [enterApp]);

  // Persist the chosen role + continue. Contractors get the one-time paywall;
  // posters go straight in. Shared by both entry paths below.
  const finishWithRole = useCallback(
    async (input: OnboardingInput) => {
      await submitOnboarding(input);
      await refreshAuth();
      if (input.role === "JOB_SEEKER") setShowPaywall(true);
      else enterApp();
    },
    [refreshAuth, enterApp],
  );

  // Role chosen → sign in (carrying the role) → persist. If the user is ALREADY
  // signed in (came here from the Profile "finish setting up" prompt), skip the
  // sign-in step and persist directly. A cancelled sign-in sheet leaves them on
  // the role step.
  const onPickRole = async (
    input: OnboardingInput,
    provider: "google" | "apple",
  ) => {
    setSubmitting(true);
    try {
      if (!isAuthenticated) {
        const res =
          provider === "google"
            ? await signInWithGoogleHandler()
            : await signInWithAppleHandler();
        if (!res) return; // cancelled
      }
      await finishWithRole(input);
    } catch {
      toast.error("Couldn’t finish setting up — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (showPaywall) return <OnboardingPaywall onContinue={enterApp} />;

  return (
    <OnboardingCarousel
      submitting={submitting}
      alreadySignedIn={isAuthenticated}
      onPickRole={onPickRole}
      onSkip={onSkip}
    />
  );
};

export default OnboardingScreen;
