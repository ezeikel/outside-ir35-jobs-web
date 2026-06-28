import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import CandidateSwipeCard from "@/components/CandidateSwipeCard";
import ErrorState from "@/components/ErrorState";
import SwipeDeck, { type SwipeDeckHandle } from "@/components/SwipeDeck";
import {
  type ApplicantStatus,
  type CandidateCard,
  fetchApplicants,
  setApplicationStatus,
} from "@/lib/api-applicants";

// The recruiter candidate deck: swipe the untriaged (NEW) applicants on the
// caller's jobs. RIGHT = shortlist, LEFT = pass — the poster's own decision,
// persisted to the application's status. Reuses the same SwipeDeck primitive as
// the seeker job deck; the only differences are the card + the swipe semantics.
//
// Colours match the seeker deck's mapping: GREEN = the positive action
// (shortlist), RED = the negative (pass).
const SHORTLIST_GREEN = "#1f5d43";
const PASS_RED = "#dc2626";

const APPLICANTS_KEY = ["applicants", "NEW"] as const;

const ActionButton = ({
  icon,
  bg,
  label,
  onPress,
}: {
  icon: typeof faCheck;
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
    <FontAwesomeIcon icon={icon} size={24} color="#ffffff" />
  </Pressable>
);

const Hint = ({ label, tone }: { label: string; tone: "yes" | "no" }) => (
  <View
    className="rounded-xl border-2 px-4 py-2"
    style={{
      borderColor: tone === "yes" ? SHORTLIST_GREEN : PASS_RED,
      transform: [{ rotate: tone === "yes" ? "-12deg" : "12deg" }],
    }}
  >
    <Text
      className="font-sans-semibold text-xl uppercase"
      style={{ color: tone === "yes" ? SHORTLIST_GREEN : PASS_RED }}
    >
      {label}
    </Text>
  </View>
);

const CandidateDeck = ({ bottomInset }: { bottomInset: number }) => {
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading, isError, refetch } = useQuery({
    queryKey: APPLICANTS_KEY,
    queryFn: () => fetchApplicants("NEW"),
  });

  // Triage = set status. We don't optimistically remove from the list (the deck's
  // own swiped-set already advances past the card); we just persist, and a failure
  // surfaces via the catch. The NEW-queue refetches when the deck empties.
  const triage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicantStatus }) =>
      setApplicationStatus(id, status),
    onError: () => {
      // Best-effort: a failed triage will reappear in NEW on next refetch.
      void queryClient.invalidateQueries({ queryKey: APPLICANTS_KEY });
    },
  });

  const handleRef = useRef<SwipeDeckHandle | null>(null);
  const onReady = useCallback((h: SwipeDeckHandle) => {
    handleRef.current = h;
  }, []);

  const onSwipeRight = useCallback(
    (c: CandidateCard) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      triage.mutate({ id: c.applicationId, status: "SHORTLISTED" });
    },
    [triage],
  );
  const onSwipeLeft = useCallback(
    (c: CandidateCard) => {
      void Haptics.selectionAsync();
      triage.mutate({ id: c.applicationId, status: "PASSED" });
    },
    [triage],
  );

  const renderCard = useCallback(
    (c: CandidateCard) => <CandidateSwipeCard candidate={c} />,
    [],
  );

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingBottom: bottomInset }}
      >
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1" style={{ paddingBottom: bottomInset }}>
        <ErrorState
          title="Couldn’t load applicants"
          body="We couldn’t reach your applicants. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (candidates.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-10"
        style={{ paddingBottom: bottomInset }}
      >
        <FontAwesomeIcon icon={faCheck} size={40} color="#a3a09e" />
        <Text className="mt-5 text-center font-display text-2xl text-foreground">
          No one to review
        </Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          New applicants to your contracts will appear here to shortlist or pass.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ paddingBottom: bottomInset }}>
      <View className="flex-1 items-center px-5 pb-3 pt-2">
        <View className="w-full flex-1" style={{ maxWidth: 520, maxHeight: 680 }}>
          <SwipeDeck<CandidateCard>
            items={candidates}
            keyExtractor={(c) => c.applicationId}
            renderCard={renderCard}
            onSwipeRight={onSwipeRight}
            onSwipeLeft={onSwipeLeft}
            onReady={onReady}
            onEmpty={() => refetch()}
            showCounter
            rightHint={<Hint label="Shortlist" tone="yes" />}
            leftHint={<Hint label="Pass" tone="no" />}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-8 pb-2">
        <ActionButton
          icon={faXmark}
          bg={PASS_RED}
          label="Pass on this candidate"
          onPress={() => handleRef.current?.swipeLeft()}
        />
        <ActionButton
          icon={faCheck}
          bg={SHORTLIST_GREEN}
          label="Shortlist this candidate"
          onPress={() => handleRef.current?.swipeRight()}
        />
      </View>
    </View>
  );
};

export default CandidateDeck;
