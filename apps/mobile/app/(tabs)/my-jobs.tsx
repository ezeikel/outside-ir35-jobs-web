import { faHeart, faRectangleList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useViewMode } from "@/hooks/useViewMode";

// "My jobs" (seeker) / "My posts" (hiring). Mode-aware. Seekers get Saved +
// Applications sub-tabs; hirers get their listings. The data surfaces (saved
// jobs, applications, my posts) are filled in by follow-on work — for now this is
// the shell with the right structure + empty states.

const SegTab = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    className="flex-1 items-center border-b-2 pb-3 pt-2 active:opacity-70"
    style={{ borderBottomColor: active ? "#17181a" : "transparent" }}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text
      className={`text-base ${active ? "font-sans-semibold text-foreground" : "text-muted-foreground"}`}
    >
      {label}
    </Text>
  </Pressable>
);

const EmptyState = ({
  icon,
  title,
  body,
}: {
  icon: typeof faHeart;
  title: string;
  body: string;
}) => (
  <View className="flex-1 items-center justify-center px-10">
    <FontAwesomeIcon icon={icon} size={44} color="#a3a09e" />
    <Text className="mt-5 font-display text-2xl text-foreground">{title}</Text>
    <Text className="mt-2 text-center text-sm text-muted-foreground">
      {body}
    </Text>
  </View>
);

const SignedOut = ({ insetTop }: { insetTop: number }) => {
  const router = useRouter();
  return (
    <View
      className="flex-1 items-center justify-center bg-background px-10"
      style={{ paddingTop: insetTop }}
    >
      <FontAwesomeIcon icon={faHeart} size={44} color="#a3a09e" />
      <Text className="mt-5 font-display text-2xl text-foreground">
        Save jobs for later
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        Sign in to save contracts and track the ones you’ve applied to.
      </Text>
      <Pressable
        className="mt-6 rounded-lg bg-primary px-6 py-3 active:opacity-90"
        onPress={() => router.push("/(tabs)/profile")}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        <Text className="font-sans-semibold text-primary-foreground">
          Sign in
        </Text>
      </Pressable>
    </View>
  );
};

const MyJobsScreen = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { mode } = useViewMode();
  const [tab, setTab] = useState<"saved" | "applications">("saved");

  if (!isAuthenticated) return <SignedOut insetTop={insets.top} />;

  // Hiring view — the user's listings.
  if (mode === "hiring") {
    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="px-6 pb-3 font-display text-3xl text-foreground">
          My posts
        </Text>
        <EmptyState
          icon={faRectangleList}
          title="No contracts posted yet"
          body="Your live and draft listings will appear here. Post a contract from your profile."
        />
        <View style={{ height: insets.bottom + TAB_BAR_HEIGHT }} />
      </View>
    );
  }

  // Seeker view — Saved + Applications.
  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Text className="px-6 pb-2 font-display text-3xl text-foreground">
        My jobs
      </Text>
      <View className="flex-row border-b border-border px-6">
        <SegTab
          label="Saved"
          active={tab === "saved"}
          onPress={() => setTab("saved")}
        />
        <SegTab
          label="Applications"
          active={tab === "applications"}
          onPress={() => setTab("applications")}
        />
      </View>

      {tab === "saved" ? (
        <SavedTab bottomInset={insets.bottom + TAB_BAR_HEIGHT} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT,
          }}
        >
          <EmptyState
            icon={faRectangleList}
            title="No applications yet"
            body="Contracts you apply to will appear here so you can track them."
          />
        </ScrollView>
      )}
    </View>
  );
};

// Saved jobs list — shares the React Query cache with the heart on JobCard, so
// unsaving here (or anywhere) updates everywhere.
const SavedTab = ({ bottomInset }: { bottomInset: number }) => {
  const { saved, savedIds, canSave, toggle, isLoading, isRefetching, refetch } =
    useSavedJobs();

  // Refetch whenever the tab gains focus, so entering My Jobs always reflects the
  // server (jobs saved on the board this session show up reliably). The optimistic
  // cache renders immediately; this reconciles synthetic rows + anything missed.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (saved.length === 0) {
    return (
      <EmptyState
        icon={faHeart}
        title="No saved jobs yet"
        body="Tap the heart on a contract to save it. Saved jobs show up here."
      />
    );
  }

  return (
    <FlashList
      data={saved}
      // Key on the JOB id, not the saved-row id: a just-saved row starts synthetic
      // (`optimistic-<jobId>`) and the reconcile refetch swaps it for the real row.
      // Keying on the stable job id avoids a remount/flicker on that swap.
      keyExtractor={(item) => item.job.id}
      extraData={savedIds}
      renderItem={({ item }) => (
        <JobCard
          job={item.job}
          saved={savedIds.has(item.job.id)}
          canSave={canSave}
          onToggleSave={toggle}
        />
      )}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: bottomInset + 16,
      }}
      // Deliberate refresh — reconciles optimistic rows with the server (we don't
      // auto-refetch on toggle, which caused the "reappears" bug).
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    />
  );
};

export default MyJobsScreen;
