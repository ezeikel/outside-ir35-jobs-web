import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteSavedSearch,
  fetchSavedSearches,
  type SavedSearch,
  searchLabel,
  setSavedSearchAlerts,
} from "@/lib/api-searches";

// Saved searches + alerts (contractor-only). Mirrors the web /alerts page.
const AlertsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();

  const enabled = isAuthenticated && user?.role === "JOB_SEEKER";
  const { data, isLoading } = useQuery({
    queryKey: ["savedSearches"],
    queryFn: fetchSavedSearches,
    enabled,
  });

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Empty insetTop={insets.top}>
        <Text className="text-center text-muted-foreground">
          Sign in to save searches and get emailed new outside-IR35 contracts.
        </Text>
        <Pressable
          className="mt-6 rounded-lg bg-primary px-5 py-3 active:opacity-90"
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Text className="font-sans-semibold text-primary-foreground">
            Sign in
          </Text>
        </Pressable>
      </Empty>
    );
  }

  if (user?.role !== "JOB_SEEKER") {
    return (
      <Empty insetTop={insets.top}>
        <Text className="text-center text-muted-foreground">
          Saved searches are for contractor accounts.
        </Text>
      </Empty>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-6 pb-2">
        <Text className="font-display text-3xl text-foreground">Job alerts</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Searches you’ve saved. We email you new matching contracts — pause or
          delete any alert.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#17181a" />
        </View>
      ) : (data ?? []).length === 0 ? (
        <Empty insetTop={0}>
          <Text className="text-center text-muted-foreground">
            No saved searches yet. Search the board, then “Save this search”.
          </Text>
        </Empty>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16 + TAB_BAR_HEIGHT,
          }}
        >
          {(data ?? []).map((s) => (
            <SavedSearchRow key={s.id} search={s} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const SavedSearchRow = ({ search }: { search: SavedSearch }) => {
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: () => setSavedSearchAlerts(search.id, !search.alertsEnabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] }),
    onError: () => toast.error("Couldn’t update — try again."),
  });

  const remove = useMutation({
    mutationFn: () => deleteSavedSearch(search.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] }),
    onError: () => toast.error("Couldn’t delete — try again."),
  });

  const busy = toggle.isPending || remove.isPending;

  return (
    <View className="mb-3 flex-row items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <View className="min-w-0 flex-1">
        <Text className="font-display text-lg text-foreground" numberOfLines={1}>
          {searchLabel(search)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {search.alertsEnabled ? "Email alerts on" : "Alerts paused"}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          className="rounded-lg border border-border px-3 py-2 active:opacity-70"
          disabled={busy}
          onPress={() => toggle.mutate()}
        >
          <Text className="text-sm text-foreground">
            {search.alertsEnabled ? "Pause" : "Resume"}
          </Text>
        </Pressable>
        <Pressable
          className="rounded-lg px-3 py-2 active:opacity-70"
          disabled={busy}
          onPress={() => remove.mutate()}
        >
          <Text className="text-sm text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const Empty = ({
  children,
  insetTop,
}: {
  children: React.ReactNode;
  insetTop: number;
}) => (
  <View
    className="flex-1 items-center justify-center bg-background px-8"
    style={{ paddingTop: insetTop }}
  >
    {children}
  </View>
);

export default AlertsScreen;
