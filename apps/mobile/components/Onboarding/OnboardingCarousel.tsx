import {
  faBriefcase,
  faIdBadge,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useCallback, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OnboardingInput } from "@/lib/api-account";
import OnboardingSlide from "./OnboardingSlide";
import RolePickerSlide from "./RolePickerSlide";

// Swipeable onboarding: three value-prop slides then the role picker. Paging is a
// native horizontal paging ScrollView (the chunky-crayon / go-unbeaten pattern —
// no third-party carousel lib); reanimated drives the smooth pagination dots
// (off the live scroll offset) and the per-slide content reveal.

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const INTRO_SLIDES = [
  {
    icon: faBriefcase,
    iconColor: "#17181a",
    title: "Only Outside IR35",
    body: "One board with just Outside IR35 contracts — day rate, work mode and the client's IR35 position shown up front.",
  },
  {
    icon: faIdBadge,
    iconColor: "#1f5d43",
    title: "Verify once",
    body: "Build your compliance pack once — company, insurance, right-to-work — and share it in a tap instead of re-sending it to every agency.",
  },
  {
    icon: faShieldHalved,
    iconColor: "#2b3a55",
    title: "Honest by design",
    body: "We never claim a role is outside IR35 — only what the client states, attributed and dated. The SDS stays the client's call.",
  },
];

const SLIDE_COUNT = INTRO_SLIDES.length + 1; // + role picker
const ROLE_SLIDE_INDEX = INTRO_SLIDES.length;

// Smooth pagination dot — width/opacity interpolate off the continuous scroll
// progress (scrollX / width), so the active dot grows as you drag between pages.
const PaginationDot = ({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];
    return {
      width: interpolate(progress.get(), inputRange, [8, 24, 8], "clamp"),
      opacity: interpolate(progress.get(), inputRange, [0.4, 1, 0.4], "clamp"),
    };
  });
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          marginHorizontal: 4,
          backgroundColor: "#17181a",
        },
        style,
      ]}
    />
  );
};

const OnboardingCarousel = ({
  submitting,
  alreadySignedIn,
  onPickRole,
  onSkip,
}: {
  submitting: boolean;
  alreadySignedIn: boolean;
  onPickRole: (input: OnboardingInput, provider: "google" | "apple") => void;
  onSkip: () => void;
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  // Continuous page progress (in page units) for the dots.
  const progress = useSharedValue(0);
  const [current, setCurrent] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    progress.value = width > 0 ? event.contentOffset.x / width : 0;
  });

  // Discrete active index for slide isActive + Next/Skip — settled on momentum end.
  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      if (index !== current) setCurrent(index);
    },
    [width, current],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
      setCurrent(index);
    },
    [width],
  );

  const onRoleSlide = current === ROLE_SLIDE_INDEX;

  return (
    <View className="flex-1 bg-background">
      {/* Skip → jump straight to the role picker. */}
      {!onRoleSlide ? (
        <Pressable
          className="absolute right-6 z-10"
          style={{ top: insets.top + 8 }}
          onPress={() => scrollToIndex(ROLE_SLIDE_INDEX)}
        >
          <Text className="font-sans-semibold text-base text-muted-foreground">
            Skip
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <AnimatedScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
        >
          {INTRO_SLIDES.map((slide, i) => (
            <View key={slide.title} style={{ width }}>
              <OnboardingSlide
                icon={slide.icon}
                iconColor={slide.iconColor}
                title={slide.title}
                body={slide.body}
                isActive={current === i}
              />
            </View>
          ))}
          <View style={{ width }}>
            <RolePickerSlide
              isActive={current === ROLE_SLIDE_INDEX}
              submitting={submitting}
              alreadySignedIn={alreadySignedIn}
              onPickRole={onPickRole}
              onSkip={onSkip}
            />
          </View>
        </AnimatedScrollView>
      </View>

      {/* Dots + Next (the role slide carries its own CTA). */}
      <View className="px-8" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="mb-6 flex-row items-center justify-center">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <PaginationDot key={i} index={i} progress={progress} />
          ))}
        </View>

        {!onRoleSlide ? (
          <Pressable
            className="rounded-lg bg-primary p-4 active:opacity-90"
            onPress={() => scrollToIndex(current + 1)}
          >
            <Text className="text-center font-sans-semibold text-primary-foreground">
              Next
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

export default OnboardingCarousel;
