import {
  faArrowsRotate,
  faHeart,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import JobSwipeCard from "@/components/JobSwipeCard";
import SwipeDeck, { type SwipeDeckHandle } from "@/components/SwipeDeck";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import type { MobileJobCard } from "@/lib/api-jobs";
import { useDismissedJobsStore } from "@/stores/dismissedJobsStore";

// The swipeable card deck — the seeker's default board view. RIGHT = save (into
// the real saved-jobs system), LEFT = dismiss (local "not interested", hidden from
// the deck). Apply stays a deliberate action on the detail screen — the swipe is
// triage, not commitment.
//
// The deck is built from the SAME job list the list view renders (passed in as
// `jobs`), minus anything already dismissed. So filters/search define the deck;
// they don't compete with it.

const ActionButton = ({
  icon,
  color,
  bg,
  label,
  onPress,
}: {
  icon: typeof faHeart;
  color: string;
  bg: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    className="h-16 w-16 items-center justify-center rounded-full active:opacity-70"
    style={{ backgroundColor: bg }}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <FontAwesomeIcon icon={icon} size={24} color={color} />
  </Pressable>
);

const Hint = ({ label, tone }: { label: string; tone: "save" | "dismiss" }) => (
  <View
    className="rounded-xl border-2 px-4 py-2"
    style={{
      borderColor: tone === "save" ? "#c2410c" : "#78716c",
      transform: [{ rotate: tone === "save" ? "-12deg" : "12deg" }],
    }}
  >
    <Text
      className="font-sans-semibold text-xl uppercase"
      style={{ color: tone === "save" ? "#c2410c" : "#78716c" }}
    >
      {label}
    </Text>
  </View>
);

const JobDeck = ({
  jobs,
  bottomInset,
  onEmptyAction,
}: {
  jobs: MobileJobCard[];
  bottomInset: number;
  // Tapped from the empty state ("widen your search") — opens the filter sheet.
  onEmptyAction: () => void;
}) => {
  const router = useRouter();
  const { toggle, savedIds } = useSavedJobs();
  const dismissedIds = useDismissedJobsStore((s) => s.ids);
  const dismiss = useDismissedJobsStore((s) => s.dismiss);
  const clearDismissed = useDismissedJobsStore((s) => s.clear);

  const handleRef = useRef<SwipeDeckHandle | null>(null);
  const onReady = useCallback((h: SwipeDeckHandle) => {
    handleRef.current = h;
  }, []);

  // The deck is the live job list minus dismissed cards. Already-saved jobs stay
  // in the deck (you can swipe past one you saved); dismissed ones are removed.
  const deck = useMemo(
    () => jobs.filter((j) => !dismissedIds.includes(j.id)),
    [jobs, dismissedIds],
  );

  // Track whether the deck has been emptied by swiping (vs. never had cards).
  const [exhausted, setExhausted] = useState(false);

  const onSwipeRight = useCallback(
    (job: MobileJobCard) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Only save if not already saved (avoid toggling a save back off).
      if (!savedIds.has(job.id)) toggle(job);
    },
    [savedIds, toggle],
  );

  const onSwipeLeft = useCallback(
    (job: MobileJobCard) => {
      void Haptics.selectionAsync();
      dismiss(job.id);
    },
    [dismiss],
  );

  const renderCard = useCallback(
    (job: MobileJobCard) => (
      <Pressable
        className="flex-1"
        onPress={() => router.push(`/job/${job.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${job.position}`}
      >
        <JobSwipeCard job={job} />
      </Pressable>
    ),
    [router],
  );

  // Empty: either nothing matched the search, or every card has been triaged.
  if (deck.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-10"
        style={{ paddingBottom: bottomInset }}
      >
        <FontAwesomeIcon icon={faHeart} size={40} color="#a3a09e" />
        <Text className="mt-5 text-center font-display text-2xl text-foreground">
          {exhausted || dismissedIds.length > 0
            ? "That’s everyone for now"
            : "No contracts match"}
        </Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          {exhausted || dismissedIds.length > 0
            ? "You’ve been through the deck. Widen your search or check back as new contracts land."
            : "Try a broader search or clear some filters to build your deck."}
        </Text>
        <Pressable
          className="mt-6 rounded-lg bg-primary px-5 py-3 active:opacity-90"
          onPress={onEmptyAction}
          accessibilityRole="button"
          accessibilityLabel="Adjust your search"
        >
          <Text className="font-sans-semibold text-primary-foreground">
            Adjust your search
          </Text>
        </Pressable>
        {dismissedIds.length > 0 ? (
          <Pressable
            className="mt-3 flex-row items-center gap-2 active:opacity-60"
            onPress={() => {
              clearDismissed();
              setExhausted(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Reset dismissed contracts"
          >
            <FontAwesomeIcon icon={faArrowsRotate} size={13} color="#78716c" />
            <Text className="text-sm text-muted-foreground">
              Reset dismissed ({dismissedIds.length})
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ paddingBottom: bottomInset }}>
      {/* The deck. Fixed-height card area; buttons sit below. */}
      <View className="flex-1 px-5 pb-3 pt-2">
        <SwipeDeck<MobileJobCard>
          items={deck}
          keyExtractor={(j) => j.id}
          renderCard={renderCard}
          onSwipeRight={onSwipeRight}
          onSwipeLeft={(job) => {
            onSwipeLeft(job);
            // If that was the last card, flip to the "you've been through it" copy.
            if (deck.length === 1) setExhausted(true);
          }}
          onReady={onReady}
          rightHint={<Hint label="Save" tone="save" />}
          leftHint={<Hint label="Pass" tone="dismiss" />}
        />
      </View>

      {/* Action buttons mirror the swipe — discoverable, accessible, and the only
          reliable way to drive the deck in a simulator. */}
      <View className="flex-row items-center justify-center gap-8 pb-2">
        <ActionButton
          icon={faXmark}
          color="#78716c"
          bg="#f6f5f4"
          label="Dismiss this contract"
          onPress={() => handleRef.current?.swipeLeft()}
        />
        <ActionButton
          icon={faHeart}
          color="#ffffff"
          bg="#c2410c"
          label="Save this contract"
          onPress={() => handleRef.current?.swipeRight()}
        />
      </View>
    </View>
  );
};

export default JobDeck;
