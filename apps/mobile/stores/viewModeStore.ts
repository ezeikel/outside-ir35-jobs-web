import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Which experience the app shows: "seeker" (find + apply to contracts) or
// "hiring" (post + manage listings). DUAL-CAPABILITY: the backend lets any
// onboarded user do both, so this is purely a UI mode the user can switch in
// Settings. `null` = follow the user's onboarding role as the default; once they
// explicitly switch, the override persists.
export type ViewMode = "seeker" | "hiring";

type ViewModeState = {
  override: ViewMode | null;
};

type ViewModeActions = {
  setMode: (mode: ViewMode) => void;
  clear: () => void;
};

export const useViewModeStore = create<ViewModeState & ViewModeActions>()(
  persist(
    (set) => ({
      override: null,
      setMode: (mode) => set({ override: mode }),
      clear: () => set({ override: null }),
    }),
    {
      name: "view-mode-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Map a DB role to the default view mode (a poster defaults to the hiring view).
export const roleToMode = (
  role: "JOB_SEEKER" | "JOB_POSTER" | null,
): ViewMode => (role === "JOB_POSTER" ? "hiring" : "seeker");
