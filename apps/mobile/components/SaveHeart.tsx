import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// The save toggle used on job cards + the job detail screen. Filled orange when
// saved, muted grey when not. On a SAVE it pops (scale up then settle) and fires a
// light haptic so the action feels instant + tactile; unsave just settles back.
// Pairs with useSavedJobs' optimistic id set so the colour flips with no network
// wait — the animation rides on that instant state change.

const SAVED = "#c2410c";
const UNSAVED = "#d6d4d1";

const SaveHeart = ({
  saved,
  onToggle,
  size = 18,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Pop only when saving (going saved). Unsaving settles without the bounce.
    if (!saved) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withTiming(1.35, { duration: 120 }),
        withSpring(1, { damping: 6, stiffness: 220 }),
      );
    } else {
      void Haptics.selectionAsync();
      scale.value = withSequence(
        withTiming(0.85, { duration: 90 }),
        withSpring(1, { damping: 8, stiffness: 220 }),
      );
    }
    onToggle();
  };

  return (
    <Pressable
      className="-m-2 p-2 active:opacity-60"
      hitSlop={8}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save this job"}
      accessibilityState={{ selected: saved }}
    >
      <Animated.View style={animatedStyle}>
        <FontAwesomeIcon
          icon={faHeart}
          size={size}
          color={saved ? SAVED : UNSAVED}
        />
      </Animated.View>
    </Pressable>
  );
};

export default SaveHeart;
