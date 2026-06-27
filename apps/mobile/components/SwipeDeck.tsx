import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// A generic, gesture-driven card stack (Reanimated 4 UI-thread worklets +
// gesture-handler Pan). The TOP card follows the finger with a slight rotation;
// one card peeks behind (scales up as the top leaves). Release past the threshold
// flings the card off-screen and fires onSwipe{Right,Left}; otherwise it springs
// back. Left/right "hint" overlays fade in with drag distance so the meaning of
// each direction is obvious mid-gesture.
//
// Deliberately generic over the item type: the seeker job deck and the recruiter
// candidate deck share this exact primitive and only differ in renderCard +
// the swipe semantics the parent attaches.
//
// Accessibility + testability: gestures alone aren't reachable for everyone (and
// aren't reliably scriptable in a simulator), so the parent ALSO renders explicit
// buttons that call the imperative swipeLeft/swipeRight handed back via onReady.

const SCREEN_W = Dimensions.get("window").width;
// Past this horizontal drag (as a fraction of screen width) a release commits the
// swipe instead of springing back.
const SWIPE_THRESHOLD = 0.28;
// How far off-screen to fling a committed card.
const FLING_X = SCREEN_W * 1.5;

export type SwipeDeckHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
};

type SwipeDeckProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onSwipeRight: (item: T) => void;
  onSwipeLeft: (item: T) => void;
  // Optional drag-direction hint overlays (e.g. "Save" / "Dismiss"). Their opacity
  // is driven by drag distance toward that side.
  rightHint?: React.ReactNode;
  leftHint?: React.ReactNode;
  // Hands the parent imperative swipe triggers so on-screen buttons can drive the
  // same animation + callbacks as a gesture.
  onReady?: (handle: SwipeDeckHandle) => void;
  // Fired when the last card is swiped away (the deck just became empty). Lets the
  // parent show a "you've been through the deck" state without tracking the count.
  onEmpty?: () => void;
};

const SwipeDeck = <T,>({
  items,
  keyExtractor,
  renderCard,
  onSwipeRight,
  onSwipeLeft,
  rightHint,
  leftHint,
  onReady,
  onEmpty,
}: SwipeDeckProps<T>) => {
  // Which cards have been swiped THIS session, tracked by key (not a numeric
  // index). This is robust to the parent re-filtering `items` underneath us: a
  // dismiss removes the card from `items` AND it's in `swiped`, but deriving the
  // queue by skipping `swiped` keys means a card is never double-counted (the
  // "skipped a card on dismiss" bug a bare incrementing index causes). Save leaves
  // the card in `items`; the swiped-set still advances past it correctly.
  const [swiped, setSwiped] = useState<Set<string>>(new Set());

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // The visible queue = items not yet swiped. Top is the first; next peeks behind.
  const queue = useMemo(
    () => items.filter((it) => !swiped.has(keyExtractor(it))),
    [items, swiped, keyExtractor],
  );
  const top = queue[0];
  const next = queue[1];

  // Mark the top card swiped + fire the callback. Runs on the JS thread (state
  // update) — called via runOnJS after the fling animation.
  const advance = useCallback(
    (direction: "left" | "right", item: T) => {
      if (direction === "right") onSwipeRight(item);
      else onSwipeLeft(item);
      setSwiped((s) => {
        const nextSet = new Set(s);
        nextSet.add(keyExtractor(item));
        // If this was the last unswiped card, tell the parent the deck is empty.
        const remaining = items.filter((it) => !nextSet.has(keyExtractor(it)));
        if (remaining.length === 0) onEmpty?.();
        return nextSet;
      });
      translateX.value = 0;
      translateY.value = 0;
    },
    [onSwipeRight, onSwipeLeft, onEmpty, items, keyExtractor, translateX, translateY],
  );

  // Fling the current top card off-screen in `direction`, then advance. Used by
  // both the gesture (on release past threshold) and the buttons.
  const commit = useCallback(
    (direction: "left" | "right") => {
      const item = queue[0];
      if (!item) return;
      const toX = direction === "right" ? FLING_X : -FLING_X;
      translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
        if (finished) runOnJS(advance)(direction, item);
      });
    },
    [queue, translateX, advance],
  );

  const pan = Gesture.Pan()
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    })
    .onEnd(() => {
      const past = Math.abs(translateX.value) > SCREEN_W * SWIPE_THRESHOLD;
      if (!past) {
        // Snap back.
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
        return;
      }
      const direction = translateX.value > 0 ? "right" : "left";
      const toX = direction === "right" ? FLING_X : -FLING_X;
      translateX.value = withTiming(toX, { duration: 200 }, (finished) => {
        if (finished && top) runOnJS(advance)(direction, top);
      });
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_W, 0, SCREEN_W],
          [-8, 0, 8],
        )}deg`,
      },
    ],
  }));

  // The card behind scales up + lifts toward full size as the top card leaves.
  const nextStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / SCREEN_W, 1);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [0.94, 1]) }],
      opacity: interpolate(progress, [0, 1], [0.6, 1]),
    };
  });

  // Hints don't just fade in — they ramp through STAGES as you drag further
  // (Tinder-style): opacity AND scale grow with distance, so the gesture's
  // intent (and how committed it is) reads at a glance. They pop slightly past
  // the commit threshold.
  const rightHintStyle = useAnimatedStyle(() => {
    const d = Math.max(translateX.value, 0);
    return {
      opacity: interpolate(d, [0, SCREEN_W * 0.18], [0, 1], "clamp"),
      transform: [
        {
          scale: interpolate(
            d,
            [0, SCREEN_W * 0.18, SCREEN_W * SWIPE_THRESHOLD],
            [0.7, 1, 1.18],
            "clamp",
          ),
        },
      ],
    };
  });
  const leftHintStyle = useAnimatedStyle(() => {
    const d = Math.max(-translateX.value, 0);
    return {
      opacity: interpolate(d, [0, SCREEN_W * 0.18], [0, 1], "clamp"),
      transform: [
        {
          scale: interpolate(
            d,
            [0, SCREEN_W * 0.18, SCREEN_W * SWIPE_THRESHOLD],
            [0.7, 1, 1.18],
            "clamp",
          ),
        },
      ],
    };
  });

  // Progressive colour wash over the card: a green "save" tint deepens as you drag
  // right, a muted "pass" tint as you drag left. It saturates toward the commit
  // threshold so the card visibly "arms" the action before you let go.
  const saveTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SCREEN_W * SWIPE_THRESHOLD],
      [0, 0.22],
      "clamp",
    ),
  }));
  const passTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SCREEN_W * SWIPE_THRESHOLD, 0],
      [0.22, 0],
      "clamp",
    ),
  }));

  // Expose imperative triggers to the parent (so on-screen buttons fire the same
  // animation + callbacks as a gesture). Re-handed whenever `commit` changes
  // (i.e. when the top card advances), so the buttons always act on the live card.
  useEffect(() => {
    onReady?.({
      swipeRight: () => commit("right"),
      swipeLeft: () => commit("left"),
    });
  }, [onReady, commit]);

  if (!top) return null;

  return (
    <View className="flex-1 items-center justify-center">
      {/* Peek card behind. */}
      {next ? (
        <Animated.View
          key={keyExtractor(next)}
          style={[
            { position: "absolute", width: "100%", height: "100%" },
            nextStyle,
          ]}
          pointerEvents="none"
        >
          {renderCard(next)}
        </Animated.View>
      ) : null}

      {/* Top card — gesture target. */}
      <GestureDetector gesture={pan}>
        <Animated.View
          key={keyExtractor(top)}
          style={[{ width: "100%", height: "100%" }, topStyle]}
        >
          {renderCard(top)}

          {/* Progressive colour wash — deepens with drag distance toward each
              side's commit threshold. Rounded to match the card; non-interactive. */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 28,
                backgroundColor: "#1f5d43",
              },
              saveTintStyle,
            ]}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 28,
                backgroundColor: "#44403c",
              },
              passTintStyle,
            ]}
            pointerEvents="none"
          />

          {/* Direction hints overlaid on the top card. */}
          {rightHint ? (
            <Animated.View
              style={[
                { position: "absolute", top: 24, left: 24 },
                rightHintStyle,
              ]}
              pointerEvents="none"
            >
              {rightHint}
            </Animated.View>
          ) : null}
          {leftHint ? (
            <Animated.View
              style={[
                { position: "absolute", top: 24, right: 24 },
                leftHintStyle,
              ]}
              pointerEvents="none"
            >
              {leftHint}
            </Animated.View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeDeck;
