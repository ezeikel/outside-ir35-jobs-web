import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import RichText from "@/components/RichText";
import SaveHeart from "@/components/SaveHeart";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import {
  type ApplyEligibility,
  applyToJob,
  fetchJob,
  fetchJobPitch,
} from "@/lib/api-jobs";
import { formatDayRate } from "@/lib/format";

// Job detail. Shows the role, the attributed IR35 claim (when the client states
// outside — never our assertion), the description, and an apply control whose
// state comes from the server's eligibility (apply / already-applied / sign-in /
// link-out for aggregated).
const JobDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { canSave, isSaved, toggle } = useSavedJobs();

  const { data, isLoading, isError } = useQuery({
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

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-muted-foreground">
          Contract not found. It may have been filled or removed.
        </Text>
      </View>
    );
  }

  const { job, apply } = data;
  const saved = isSaved(job.id);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-xs text-muted-foreground">
            {job.companyName} · {job.location}
          </Text>
          <Text className="mt-1 font-display text-2xl text-foreground">
            {job.position}
          </Text>
        </View>

        {/* Save toggle (seeker view only). Shares state with the board + My Jobs. */}
        {canSave ? (
          <SaveHeart saved={saved} onToggle={() => toggle(job)} size={22} />
        ) : null}
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Chip label={job.ir35Label} />
        <Chip label={job.workModeLabel} />
        {job.contractLengthDays ? (
          <Chip label={`${job.contractLengthDays}d`} />
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
            determine or verify IR35 status; the SDS is the client’s legal
            responsibility.
          </Text>
        </View>
      ) : null}

      <Text className="mt-6 font-sans-semibold text-base text-foreground">
        About the role
      </Text>
      {job.descriptionHtml?.trim() ? (
        <View className="mt-2">
          <RichText html={job.descriptionHtml} />
        </View>
      ) : (
        <Text className="mt-2 text-sm leading-6 text-foreground">
          {job.descriptionText || "No description provided."}
        </Text>
      )}

      <ApplyControl
        jobId={job.id}
        source={job.source}
        sourceUrl={job.sourceUrl}
        eligibility={apply}
      />
    </ScrollView>
  );
};

const Chip = ({ label }: { label: string }) => (
  <Text className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
    {label}
  </Text>
);

const ApplyControl = ({
  jobId,
  source,
  sourceUrl,
  eligibility,
}: {
  jobId: string;
  source: "NATIVE" | "AGGREGATED";
  sourceUrl: string | null;
  eligibility?: ApplyEligibility;
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => applyToJob(jobId, note),
    onSuccess: () => {
      toast.success("Applied. The poster can see your verified profile.");
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Couldn’t apply right now.";
      toast.error(msg);
    },
  });

  // "Draft with AI": fetch a tailored pitch from the contractor's CV + this role
  // and drop it into the note. Premium-gated server-side; we route each status to
  // the right nudge (add a CV / go premium / retry).
  const pitch = useMutation({
    mutationFn: () => fetchJobPitch(jobId),
    onSuccess: (result) => {
      if (result.status === "ok") {
        setNote(result.pitch);
        toast.success("Drafted from your CV. Edit it before you send.");
      } else if (result.status === "not_premium") {
        toast("AI pitch is a premium feature.");
        router.push("/premium");
      } else if (result.status === "no_cv") {
        toast("Add a CV to your profile to draft a pitch.");
      } else {
        toast.error("Couldn’t draft a pitch. Try again.");
      }
    },
    onError: () => toast.error("Couldn’t draft a pitch. Try again."),
  });

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

  // Signed out → point to the Profile tab to sign in.
  if (!isAuthenticated) {
    return (
      <Pressable
        className="mt-6 rounded-lg border border-border bg-card p-4 active:opacity-80"
        onPress={() => router.push("/(tabs)/profile")}
      >
        <Text className="text-center font-sans-semibold text-foreground">
          Sign in to apply
        </Text>
      </Pressable>
    );
  }

  if (eligibility?.alreadyApplied) {
    return (
      <View className="mt-6 rounded-lg border border-verified bg-verified-muted p-4">
        <Text className="text-center text-sm text-foreground">
          ✓ You’ve applied. The poster can see your verified profile.
        </Text>
      </View>
    );
  }

  // Eligible contractor → cover note + apply.
  if (eligibility?.canApply) {
    return (
      <View className="mt-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-sans-medium text-muted-foreground">
            Your note to the poster
          </Text>
          <Pressable
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 active:opacity-70"
            disabled={pitch.isPending}
            onPress={() => pitch.mutate()}
            accessibilityRole="button"
            accessibilityLabel="Draft a pitch with AI from your CV"
          >
            {pitch.isPending ? (
              <ActivityIndicator size="small" color="#17181a" />
            ) : (
              <FontAwesomeIcon icon={faWandMagicSparkles} size={12} color="#c2410c" />
            )}
            <Text className="text-xs font-sans-semibold text-foreground">
              {pitch.isPending ? "Drafting…" : "Draft with AI"}
            </Text>
          </Pressable>
        </View>
        <TextInput
          className="rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground"
          placeholder="Add a short note to the poster (optional)"
          placeholderTextColor="#a3a09e"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          style={{ minHeight: 72, textAlignVertical: "top" }}
        />
        <Pressable
          className="mt-3 rounded-lg bg-primary p-4 active:opacity-90"
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fbfaf9" />
          ) : (
            <Text className="text-center font-sans-semibold text-primary-foreground">
              Apply with verified profile
            </Text>
          )}
        </Pressable>
        <Text className="mt-2 text-center text-xs text-muted-foreground">
          One tap to share your verified compliance pack.
        </Text>
      </View>
    );
  }

  // Ineligible for another reason (e.g. not a contractor, own job, inactive).
  return (
    <View className="mt-6 rounded-lg border border-border bg-card p-4">
      <Text className="text-center text-sm text-muted-foreground">
        {eligibility?.reason === "not_contractor"
          ? "Only contractor accounts can apply."
          : "This role isn’t open for applications."}
      </Text>
    </View>
  );
};

export default JobDetailScreen;
