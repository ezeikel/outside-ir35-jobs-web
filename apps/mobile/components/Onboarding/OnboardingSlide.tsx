import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

// One intro slide: a big icon, a headline, and a short body. Content fades/rises
// in when the slide becomes active (mirrors the PTP/CC onboarding slides).
const OnboardingSlide = ({
  icon,
  iconColor,
  title,
  body,
  isActive,
}: {
  icon: IconDefinition;
  iconColor: string;
  title: string;
  body: string;
  isActive: boolean;
}) => (
  <View className="flex-1 items-center justify-center px-8">
    {isActive ? (
      <Animated.View
        entering={FadeIn.duration(600)}
        className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-secondary"
      >
        <FontAwesomeIcon icon={icon} color={iconColor} size={48} />
      </Animated.View>
    ) : (
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-secondary">
        <FontAwesomeIcon icon={icon} color={iconColor} size={48} />
      </View>
    )}

    {isActive ? (
      <Animated.View entering={FadeInDown.delay(120).duration(600)}>
        <Text className="text-center font-display text-3xl text-foreground">
          {title}
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted-foreground">
          {body}
        </Text>
      </Animated.View>
    ) : (
      <View>
        <Text className="text-center font-display text-3xl text-foreground">
          {title}
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted-foreground">
          {body}
        </Text>
      </View>
    )}
  </View>
);

export default OnboardingSlide;
