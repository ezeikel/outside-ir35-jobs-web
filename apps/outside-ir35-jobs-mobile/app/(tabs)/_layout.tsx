import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faBell,
  faBriefcase,
  faChartColumn,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { Tabs } from "expo-router";

// Bottom tabs: Jobs (the board), Day rates (benchmark), Profile (auth +
// verified profile). Mirrors the web's primary nav for contractors.
const TabsLayout = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#17181a",
      tabBarInactiveTintColor: "#a3a09e",
      tabBarStyle: {
        backgroundColor: "#ffffff",
        borderTopColor: "#e8e7e5",
      },
    }}
  >
    <Tabs.Screen
      name="index"
      options={{
        title: "Jobs",
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon
            icon={faBriefcase}
            color={color as string}
            size={size}
          />
        ),
      }}
    />
    <Tabs.Screen
      name="day-rates"
      options={{
        title: "Day rates",
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon
            icon={faChartColumn}
            color={color as string}
            size={size}
          />
        ),
      }}
    />
    <Tabs.Screen
      name="alerts"
      options={{
        title: "Alerts",
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faBell} color={color as string} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="profile"
      options={{
        title: "Profile",
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faUser} color={color as string} size={size} />
        ),
      }}
    />
  </Tabs>
);

export default TabsLayout;
