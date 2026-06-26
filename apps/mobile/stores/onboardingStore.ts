import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Persisted "has the user seen the first-launch onboarding?" flag. Onboarding is
// a one-time intro (value-prop carousel → role pick / browse-first) shown BEFORE
// sign-in; once completed (whether they signed in or chose to browse first) it
// never shows again. Persisted to AsyncStorage so it survives reinstalls of the
// JS bundle / app restarts. Mirrors the chunky-crayon onboarding store.
type OnboardingState = {
  hasCompleted: boolean;
};

type OnboardingActions = {
  complete: () => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      hasCompleted: false,
      complete: () => set({ hasCompleted: true }),
      reset: () => set({ hasCompleted: false }),
    }),
    {
      name: "onboarding-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
