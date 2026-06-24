import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faBriefcase,
  faChartColumn,
  faStar,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Floating translucent (glass) tab bar — content shows softly through a blur,
// matching the chunky-crayon / Titrra pattern (Apple-News look). Five evenly-
// spaced destinations; active = brand ink, inactive = muted. Replaces the
// default opaque bottom bar. The bar is absolutely positioned and the screens
// reserve bottom padding (TAB_BAR_HEIGHT) so content isn't hidden behind it.

const INK = "#17181a";
const MUTED = "#a3a09e";

// The clearance a tab screen should leave at the bottom so its last content
// isn't hidden behind the floating bar (bar height + the gap above the home
// indicator). Screens add this to their scroll/content paddingBottom.
export const TAB_BAR_HEIGHT = 64;

// Minimal shape of the props expo-router's <Tabs tabBar={...}> passes. Typed
// locally to avoid a direct dep on @react-navigation/bottom-tabs (transitive
// only under pnpm's strict isolation — same approach as CC / Titrra).
type TabRoute = { key: string; name: string };
export type GlassTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
  };
};

// route name → icon + label. Order matches the Tabs.Screen order in _layout.
const TABS: { name: string; label: string; icon: IconDefinition }[] = [
  { name: "index", label: "Jobs", icon: faBriefcase },
  { name: "day-rates", label: "Day rates", icon: faChartColumn },
  { name: "alerts", label: "Alerts", icon: faBell },
  { name: "premium", label: "Premium", icon: faStar },
  { name: "profile", label: "Profile", icon: faUser },
];

export const GlassTabBar = ({ state, navigation }: GlassTabBarProps) => {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}
    >
      <BlurView intensity={40} tint="light" style={styles.bar}>
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          const focused = focusedName === tab.name;
          const color = focused ? INK : MUTED;

          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                if (focused || !route) return;
                void Haptics.selectionAsync();
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) navigation.navigate(tab.name);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={styles.item}
            >
              <FontAwesomeIcon icon={tab.icon} size={20} color={color} />
              <Text
                style={[styles.label, { color }]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    overflow: "hidden",
    // Translucent off-white over the blur so the ink reads cleanly over busy
    // content scrolling behind (matches the web's #f6f5f3 canvas).
    backgroundColor: "rgba(246, 245, 243, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(23, 24, 26, 0.06)",
    // Soft float shadow.
    shadowColor: "#17181a",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
  },
  label: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});

export default GlassTabBar;
