import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type Ir35Filter,
  type MinRateFilter,
  type PostedFilter,
  type SearchFilters,
  type SortMode,
  type WorkModeFilter,
} from "@/lib/search-filters";

// The board's filter + sort bottom sheet. Edits a local draft, then "Show results"
// commits it (so the board doesn't re-query on every toggle). "Clear all" resets.
// All options map 1:1 to the backend SearchParams the web board honours.

const COLORS = {
  surface: "#ffffff",
  foreground: "#17181a",
  muted: "#767370",
  border: "#e8e7e5",
  primary: "#17181a",
  primaryFg: "#fbfaf9",
  handle: "#d6d4d1",
};

type Option<T> = { value: T; label: string };

const SORT_OPTIONS: Option<SortMode>[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
];
const WORK_MODE_OPTIONS: Option<WorkModeFilter>[] = [
  { value: "ANY", label: "Any" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ON_SITE", label: "On-site" },
];
const POSTED_OPTIONS: Option<PostedFilter>[] = [
  { value: "ANY", label: "Any time" },
  { value: "24h", label: "Last 24h" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];
const MIN_RATE_OPTIONS: Option<MinRateFilter>[] = [
  { value: 0, label: "Any" },
  { value: 300, label: "£300+" },
  { value: 400, label: "£400+" },
  { value: 500, label: "£500+" },
  { value: 600, label: "£600+" },
];
// Honest IR35 framing: we never assert status. This is an outside-IR35 board, so
// inside-IR35 listings are NEVER shown (no "include inside" option). "Client states
// outside" narrows to listings whose CLIENT states an outside position; default
// shows those plus not-yet-stated, and always hides inside. (docs/ir35-trust-model.md)
const IR35_OPTIONS: Option<Ir35Filter>[] = [
  { value: "default", label: "Default" },
  { value: "outside", label: "Client states outside" },
];

const Chip = <T,>({
  option,
  active,
  onPress,
}: {
  option: Option<T>;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={option.label}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {option.label}
    </Text>
  </Pressable>
);

const Group = <T,>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <View style={styles.group}>
    <Text style={styles.groupTitle}>{title}</Text>
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Chip
          key={String(opt.value)}
          option={opt}
          active={opt.value === value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  </View>
);

const FilterSheet = ({
  isOpen,
  initial,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  initial: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SearchFilters>(initial);

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const set = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => {
    void Haptics.selectionAsync();
    setDraft((d) => ({ ...d, [key]: value }));
  };

  // Re-seed the draft each time the sheet opens (so it reflects the live filters,
  // not a stale edit). Mounting only while open makes `initial` fresh per open.
  if (!isOpen) return null;

  return (
    <ModalBottomSheet
      index={1}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filters & sort</Text>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <Group
            title="Sort by"
            options={SORT_OPTIONS}
            value={draft.sort}
            onChange={(v) => set("sort", v)}
          />
          <Group
            title="Work mode"
            options={WORK_MODE_OPTIONS}
            value={draft.workMode}
            onChange={(v) => set("workMode", v)}
          />
          <Group
            title="Date posted"
            options={POSTED_OPTIONS}
            value={draft.posted}
            onChange={(v) => set("posted", v)}
          />
          <Group
            title="Minimum day rate"
            options={MIN_RATE_OPTIONS}
            value={draft.minRate}
            onChange={(v) => set("minRate", v)}
          />
          <Group
            title="IR35 position"
            options={IR35_OPTIONS}
            value={draft.ir35}
            onChange={(v) => set("ir35", v)}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.clearButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setDraft({
                workMode: "ANY",
                posted: "ANY",
                minRate: 0,
                ir35: "default",
                sort: "relevance",
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.applyButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              onApply(draft);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Show results"
          >
            <Text style={styles.applyText}>Show results</Text>
          </Pressable>
        </View>
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontFamily: "InstrumentSerif-Regular",
    fontSize: 24,
    color: COLORS.foreground,
  },
  body: {
    paddingHorizontal: 20,
  },
  group: {
    marginTop: 16,
    gap: 8,
  },
  groupTitle: {
    fontFamily: "InterTight-Medium",
    fontSize: 13,
    color: COLORS.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: "InterTight-Medium",
    fontSize: 14,
    color: COLORS.foreground,
  },
  chipTextActive: {
    color: COLORS.primaryFg,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
  },
  pressed: { opacity: 0.7 },
  clearText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: COLORS.foreground,
  },
  applyText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: COLORS.primaryFg,
  },
});

export default FilterSheet;
