import {
  faBriefcase,
  faShieldHalved,
  faIdBadge,
} from "@fortawesome/free-solid-svg-icons";
import { useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Carousel, {
  type ICarouselInstance,
} from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OnboardingInput } from "@/lib/api-account";
import OnboardingSlide from "./OnboardingSlide";
import RolePickerSlide from "./RolePickerSlide";

// Swipeable onboarding: three value-prop slides then the role picker (mirrors the
// PTP / CC onboarding carousel pattern — reanimated-carousel, animated pagination
// dots, Skip/Next, with the final slide carrying its own CTA).

const INTRO_SLIDES = [
  {
    icon: faBriefcase,
    iconColor: "#17181a",
    title: "Only outside-IR35",
    body: "One board with just outside-IR35 contracts — day rate, work mode and the client's IR35 position shown up front.",
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

const PaginationDot = ({
  index,
  activeIndex,
}: {
  index: number;
  activeIndex: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];
    return {
      width: interpolate(activeIndex.get(), inputRange, [8, 24, 8], "clamp"),
      opacity: interpolate(activeIndex.get(), inputRange, [0.4, 1, 0.4], "clamp"),
    };
  });
  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: "#17181a" },
        style,
      ]}
    />
  );
};

const OnboardingCarousel = ({
  submitting,
  onSubmitRole,
}: {
  submitting: boolean;
  onSubmitRole: (input: OnboardingInput) => void;
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const activeIndex = useSharedValue(0);
  const [current, setCurrent] = useState(0);
  const ref = useRef<ICarouselInstance>(null);

  const onRoleSlide = current === ROLE_SLIDE_INDEX;

  const renderItem = ({ index }: { index: number }) => {
    if (index === ROLE_SLIDE_INDEX) {
      return (
        <RolePickerSlide
          isActive={current === index}
          submitting={submitting}
          onSubmit={onSubmitRole}
        />
      );
    }
    const slide = INTRO_SLIDES[index];
    return (
      <OnboardingSlide
        icon={slide.icon}
        iconColor={slide.iconColor}
        title={slide.title}
        body={slide.body}
        isActive={current === index}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Skip → jump straight to the role picker. */}
      {!onRoleSlide ? (
        <Pressable
          className="absolute right-6 z-10"
          style={{ top: insets.top + 8 }}
          onPress={() => ref.current?.scrollTo({ index: ROLE_SLIDE_INDEX, animated: true })}
        >
          <Text className="font-sans-semibold text-base text-muted-foreground">
            Skip
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <Carousel
          ref={ref}
          width={width}
          height={height * 0.74}
          data={Array.from({ length: SLIDE_COUNT }, (_, i) => i)}
          renderItem={renderItem}
          onProgressChange={(_, abs) => {
            activeIndex.set(abs);
            const next = Math.round(abs);
            if (next !== current) setCurrent(next);
          }}
          pagingEnabled
          snapEnabled
          loop={false}
        />
      </View>

      {/* Dots + Next (the role slide carries its own CTA). */}
      <View className="px-8" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="mb-6 flex-row items-center justify-center">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <PaginationDot key={i} index={i} activeIndex={activeIndex} />
          ))}
        </View>

        {!onRoleSlide ? (
          <Pressable
            className="rounded-lg bg-primary p-4 active:opacity-90"
            onPress={() => ref.current?.next()}
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
