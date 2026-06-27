import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// How the seeker browses the board: a swipeable card DECK (the default — our
// standout, fast-triage view) or the scrollable LIST (power-users + accessibility
// fallback). Persisted, so the choice sticks across sessions. Defaults to "deck"
// on first run; once the user toggles, their preference is respected.

export type BoardView = "deck" | "list";

type BoardViewState = {
  view: BoardView;
};

type BoardViewActions = {
  setView: (view: BoardView) => void;
};

export const useBoardViewStore = create<BoardViewState & BoardViewActions>()(
  persist(
    (set) => ({
      view: "deck",
      setView: (view) => set({ view }),
    }),
    {
      name: "board-view-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
