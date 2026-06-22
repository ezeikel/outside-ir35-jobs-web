import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJob } from "@/lib/api-jobs";
import { formatDayRate } from "@/lib/format";

// Job detail. Shows the role, the attributed IR35 claim (when the client states
// outside — never our assertion), the description, and an apply control whose
// state depends on auth + source (native = apply in-app later; aggregated =
// open the original listing).
const JobDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-muted-foreground">
          Contract not found. It may have been filled or removed.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
    >
      <Text className="text-xs text-muted-foreground">
        {job.companyName} · {job.location}
      </Text>
      <Text className="mt-1 font-display text-2xl text-foreground">
        {job.position}
      </Text>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Text className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
          {job.ir35Label}
        </Text>
        <Text className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
          {job.workModeLabel}
        </Text>
        {job.contractLengthDays ? (
          <Text className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            {job.contractLengthDays}d
          </Text>
        ) : null}
      </View>

      <Text className="mt-4 font-sans-semibold text-lg text-foreground">
        {formatDayRate(job.dayRate)}
      </Text>

      {job.ir35Claim ? (
        <View className="mt-4 rounded-lg border border-verified bg-verified-muted p-3">
          <Text className="text-sm text-foreground">{job.ir35Claim.text}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Stated by {job.ir35Claim.attributedTo}. The platform does not
            determine or verify IR35 status — the SDS is the client’s legal
            responsibility.
          </Text>
        </View>
      ) : null}

      <Text className="mt-6 font-sans-semibold text-base text-foreground">
        About the role
      </Text>
      <Text className="mt-2 text-sm leading-6 text-foreground">
        {job.descriptionText || "No description provided."}
      </Text>

      <ApplyControl
        source={job.source}
        sourceUrl={job.sourceUrl}
        isAuthenticated={isAuthenticated}
      />
    </ScrollView>
  );
};

const ApplyControl = ({
  source,
  sourceUrl,
  isAuthenticated,
}: {
  source: "NATIVE" | "AGGREGATED";
  sourceUrl: string | null;
  isAuthenticated: boolean;
}) => {
  // Aggregated roles link out (no on-platform owner to receive an application).
  if (source === "AGGREGATED") {
    if (!sourceUrl) return null;
    return (
      <Pressable
        className="mt-6 rounded-lg bg-primary p-4 active:opacity-90"
        onPress={() => Linking.openURL(sourceUrl)}
      >
        <Text className="text-center font-sans-semibold text-primary-foreground">
          Apply on the original listing
        </Text>
      </Pressable>
    );
  }

  // Native role. In-app apply (with the verified profile) comes in the next
  // phase; for now signed-out users are pointed to sign in.
  return (
    <View className="mt-6 rounded-lg border border-border bg-card p-4">
      <Text className="text-center text-sm text-muted-foreground">
        {isAuthenticated
          ? "Apply with your verified profile — coming to mobile next."
          : "Sign in on the Profile tab to apply with your verified profile."}
      </Text>
    </View>
  );
};

export default JobDetailScreen;
