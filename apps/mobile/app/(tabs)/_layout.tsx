import { Tabs } from "expo-router";
import { GlassTabBar, type GlassTabBarProps } from "@/components/GlassTabBar";

// Bottom tabs rendered through the floating glass tab bar (CC / Titrra pattern).
// The default bar is made absolute + transparent so each screen renders
// full-height behind the floating pill; screens reserve TAB_BAR_HEIGHT of bottom
// padding (see GlassTabBar) so their last content isn't hidden.
const TabsLayout = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        position: "absolute",
        backgroundColor: "transparent",
        borderTopWidth: 0,
        elevation: 0,
      },
    }}
    tabBar={(props) => <GlassTabBar {...(props as unknown as GlassTabBarProps)} />}
  >
    <Tabs.Screen name="index" options={{ title: "Find" }} />
    <Tabs.Screen name="my-jobs" options={{ title: "My jobs" }} />
    <Tabs.Screen name="alerts" options={{ title: "Alerts" }} />
    <Tabs.Screen name="profile" options={{ title: "Profile" }} />
  </Tabs>
);

export default TabsLayout;
