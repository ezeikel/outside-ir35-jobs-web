import { faSliders } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import ErrorState from "@/components/ErrorState";
import JobCard from "@/components/JobCard";
import FilterSheet from "@/components/search/FilterSheet";
import LocationField from "@/components/search/LocationField";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useViewMode } from "@/hooks/useViewMode";
import { fetchJobs, type MobileJobCard } from "@/lib/api-jobs";
import { saveSearch } from "@/lib/api-searches";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  type SearchFilters,
  toJobsQuery,
} from "@/lib/search-filters";
import {
  recentSearchLabel,
  useRecentSearchesStore,
} from "@/stores/recentSearchesStore";

// The board. Browse Outside IR35 contracts (public, no auth). Search splits role
// + location and adds a filter/sort sheet; all of it maps to the SAME endpoint the
// web board uses, so results can never drift between surfaces. Sort is applied
// client-side (the backend ranks by relevance/newest; there's no sort param).
const JobsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { mode } = useViewMode();

  // Live inputs vs committed search. We only query on submit / suggestion-pick /
  // filter-apply, not per keystroke.
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [committed, setCommitted] = useState<{ q: string; location: string }>({
    q: "",
    location: "",
  });
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const recents = useRecentSearchesStore((s) => s.recents);
  const addRecent = useRecentSearchesStore((s) => s.add);

  // Saved-jobs state owned HERE (not per-card) so FlashList recycling can't bind a
  // heart to a neighbour's job. savedIds drives the FlashList extraData so recycled
  // cells re-render when save-state changes. (canSaveJobs === canSave below — same
  // seeker gate — kept distinct for clarity: search-save vs job-save.)
  const { canSave: canSaveJobs, savedIds, toggle } = useSavedJobs();

  const queryParams = toJobsQuery(committed.q, committed.location, filters);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["jobs", queryParams],
    queryFn: () => fetchJobs(queryParams),
  });

  // Client-side sort. "Newest" orders by postedAt desc; "Relevance" keeps the
  // server order (RRF when there's a query, newest-first otherwise).
  const jobs = useMemo<MobileJobCard[]>(() => {
    const rows = data ?? [];
    if (filters.sort !== "newest") return rows;
    return [...rows].sort(
      (a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  }, [data, filters.sort]);

  const commit = (q: string, loc: string) => {
    const next = { q: q.trim(), location: loc.trim() };
    setCommitted(next);
    addRecent({ q: next.q, location: next.location });
  };

  const save = useMutation({
    mutationFn: () =>
      saveSearch(toJobsQuery(committed.q, committed.location, filters)),
    onSuccess: () => toast.success("Saved. We’ll email you new matches."),
    onError: (e: unknown) => {
      const err = e as {
        response?: { status?: number; data?: { error?: string } };
      };
      // The free saved-search cap returns 402 — a natural paywall moment: they've
      // experienced the value (saved 3) and hit the limit. Send them to Premium.
      if (err?.response?.status === 402) {
        toast.error("You’ve hit the free saved-search limit. Go premium.");
        router.push("/premium");
        return;
      }
      toast.error(err?.response?.data?.error ?? "Couldn’t save this search.");
    },
  });

  // Saving a search is a seeker action. Gated on the active view mode, not the
  // account role — any onboarded user can switch between finding work and hiring.
  const canSave = isAuthenticated && mode === "seeker";
  const filterCount = activeFilterCount(filters);
  const showRecents =
    !role.trim() && !location.trim() && recents.length > 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-2">
        <Text className="font-display text-3xl text-foreground">Contracts</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Roles where the client states an Outside IR35 position. We never assert
          status ourselves.
        </Text>

        {/* Role / skill / company */}
        <TextInput
          className="mt-3 rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground"
          placeholder="Role, skill or company"
          placeholderTextColor="#a3a09e"
          value={role}
          onChangeText={setRole}
          onSubmitEditing={() => commit(role, location)}
          returnKeyType="search"
          autoCapitalize="none"
        />

        {/* Location (Mapbox suggestions). zIndex so its dropdown overlays the
            controls below it. */}
        <View className="mt-2" style={{ zIndex: 10 }}>
          <LocationField
            value={location}
            onChangeText={setLocation}
            onSubmit={() => commit(role, location)}
            // Picking a suggestion commits straight away with the chosen label
            // (state hasn't flushed yet, so pass it through explicitly).
            onPick={(label) => commit(role, label)}
          />
        </View>

        {/* Filters + sort bar */}
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable
            className="flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 active:opacity-70"
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filters and sort"
          >
            <FontAwesomeIcon icon={faSliders} size={14} color="#17181a" />
            <Text className="text-sm text-foreground">
              {filterCount > 0 ? `Filters (${filterCount})` : "Filters"}
            </Text>
          </Pressable>
          <Text className="text-xs text-muted-foreground">
            {filters.sort === "newest" ? "Newest first" : "Most relevant"}
          </Text>
        </View>

        {/* Recent searches (only when the inputs are empty). */}
        {showRecents ? (
          <View className="mt-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-sans-medium text-muted-foreground">
                Recent
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => useRecentSearchesStore.getState().clear()}
                accessibilityRole="button"
                accessibilityLabel="Clear recent searches"
              >
                <Text className="text-xs text-muted-foreground">Clear</Text>
              </Pressable>
            </View>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {recents.map((r) => (
                <Pressable
                  key={`${r.q}|${r.location}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 active:opacity-70"
                  onPress={() => {
                    setRole(r.q);
                    setLocation(r.location);
                    commit(r.q, r.location);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${recentSearchLabel(r)}`}
                >
                  <Text className="text-sm text-foreground">
                    {recentSearchLabel(r)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Save-search + Day rates */}
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          {canSave ? (
            <Pressable
              className="self-start rounded-lg border border-border bg-card px-3 py-2 active:opacity-70"
              disabled={save.isPending}
              onPress={() => save.mutate()}
              accessibilityRole="button"
              accessibilityLabel="Save this search and get alerts"
            >
              <Text className="text-sm text-foreground">
                {save.isPending ? "Saving…" : "＋ Save this search & get alerts"}
              </Text>
            </Pressable>
          ) : null}
          {/* Day rates moved off the tab bar — reachable from the board (its
              natural context: "what do these contracts pay?"). */}
          <Pressable
            className="self-start rounded-lg border border-border bg-card px-3 py-2 active:opacity-70"
            onPress={() => router.push("/day-rates")}
            accessibilityRole="button"
            accessibilityLabel="See day rate benchmarks"
          >
            <Text className="text-sm text-foreground">Day rates →</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#17181a" />
        </View>
      ) : isError ? (
        <ErrorState
          title="Couldn’t load the board"
          body="We couldn’t reach the contracts list. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : (
        <FlashList
          data={jobs}
          keyExtractor={(item) => item.id}
          // extraData forces recycled cells to re-render when save-state changes.
          extraData={savedIds}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              saved={savedIds.has(item.id)}
              canSave={canSaveJobs}
              onToggleSave={toggle}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16 + TAB_BAR_HEIGHT,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="items-center px-8 py-16">
              <Text className="text-center text-muted-foreground">
                No contracts match. Try a broader search or clear some filters.
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        isOpen={sheetOpen}
        initial={filters}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
};

export default JobsScreen;
