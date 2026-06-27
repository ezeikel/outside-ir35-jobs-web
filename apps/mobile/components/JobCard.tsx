import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import SaveHeart from "@/components/SaveHeart";
import type { MobileJobCard } from "@/lib/api-jobs";
import { formatDayRate, postedLabel } from "@/lib/format";

// One board card. Honest IR35 presentation: shows only the client's stated
// position label (ir35Label), never a platform assertion. INSIDE never reaches
// the board (server gates it), so we don't special-case it here.
//
// Save state is passed in (not read via a per-card hook): in a FlashList the
// cells recycle, and a per-card subscription let a recycled cell keep a stale
// job/handler binding — so tapping one card's heart could toggle a NEIGHBOUR's
// job. The parent owns useSavedJobs and passes the right callbacks per render.
const JobCard = ({
  job,
  saved,
  canSave,
  onToggleSave,
}: {
  job: MobileJobCard;
  saved: boolean;
  canSave: boolean;
  // Receives the job so the parent's handler always acts on THIS card's job,
  // even across FlashList recycling.
  onToggleSave: (job: MobileJobCard) => void;
}) => (
  <Link href={`/job/${job.id}`} asChild>
    <Pressable className="mb-3 rounded-lg border border-border bg-card p-4 active:border-ink-400">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {job.companyName} · {job.location}
          </Text>
          <Text
            className="mt-1 font-display text-lg text-foreground"
            numberOfLines={2}
          >
            {job.position}
          </Text>
        </View>

        {/* Save toggle. Seeker view only. Its own onPress handles the tap so it
            never bubbles to the card's Link. */}
        {canSave ? (
          <SaveHeart saved={saved} onToggle={() => onToggleSave(job)} />
        ) : null}
      </View>

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

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-sans-semibold text-base text-foreground">
          {formatDayRate(job.dayRate)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {postedLabel(job.postedAt)}
        </Text>
      </View>
    </Pressable>
  </Link>
);

export default JobCard;
