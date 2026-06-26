import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import { toast } from "sonner-native";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJobs } from "@/lib/api-jobs";
import { saveSearch } from "@/lib/api-searches";

// The board. Browse outside-IR35 contracts (public, no auth). Search filters the
// same endpoint the web board uses, so results can never drift between surfaces.
const JobsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["jobs", submitted],
    queryFn: () => fetchJobs(submitted ? { q: submitted } : {}),
  });

  const save = useMutation({
    mutationFn: () => saveSearch(submitted ? { q: submitted } : {}),
    onSuccess: () => toast.success("Saved — we’ll email you new matches."),
    onError: (e: unknown) => {
      const err = e as {
        response?: { status?: number; data?: { error?: string } };
      };
      // The free saved-search cap returns 402 — a natural paywall moment: they've
      // experienced the value (saved 3) and hit the limit. Send them to Premium.
      if (err?.response?.status === 402) {
        toast.error("You’ve hit the free saved-search limit — go premium.");
        router.push("/(tabs)/premium");
        return;
      }
      toast.error(err?.response?.data?.error ?? "Couldn’t save this search.");
    },
  });

  // Only contractors can save a search (matches the web gate).
  const canSave = isAuthenticated && user?.role === "JOB_SEEKER";

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-2">
        <Text className="font-display text-3xl text-foreground">
          Contracts
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Roles where the client states an outside-IR35 position. We never assert
          status ourselves.
        </Text>
        <TextInput
          className="mt-3 rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground"
          placeholder="Search role, skill or company"
          placeholderTextColor="#a3a09e"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmitted(query.trim())}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {canSave ? (
          <Pressable
            className="mt-2 self-start rounded-lg border border-border bg-card px-3 py-2 active:opacity-70"
            disabled={save.isPending}
            onPress={() => save.mutate()}
          >
            <Text className="text-sm text-foreground">
              {save.isPending ? "Saving…" : "＋ Save this search & get alerts"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#17181a" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-muted-foreground">
            Couldn’t load the board. Pull to retry.
          </Text>
        </View>
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} />}
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
                No contracts match. Try a broader search.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default JobsScreen;
