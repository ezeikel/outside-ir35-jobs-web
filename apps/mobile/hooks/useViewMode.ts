import { useAuth } from "@/contexts/AuthContext";
import {
  roleToMode,
  type ViewMode,
  useViewModeStore,
} from "@/stores/viewModeStore";

// Resolve the EFFECTIVE view mode: the user's explicit override if set, otherwise
// the default derived from their onboarding role. Plus the setter + a flag for
// whether they're currently off their default (so the UI can show "you're viewing
// as …"). Dual-capability means switching is always allowed.
export const useViewMode = (): {
  mode: ViewMode;
  defaultMode: ViewMode;
  isOverridden: boolean;
  setMode: (mode: ViewMode) => void;
  clear: () => void;
} => {
  const { user } = useAuth();
  const override = useViewModeStore((s) => s.override);
  const setMode = useViewModeStore((s) => s.setMode);
  const clear = useViewModeStore((s) => s.clear);

  const defaultMode = roleToMode(user?.role ?? null);
  const mode = override ?? defaultMode;

  return {
    mode,
    defaultMode,
    isOverridden: override !== null && override !== defaultMode,
    setMode,
    clear,
  };
};
