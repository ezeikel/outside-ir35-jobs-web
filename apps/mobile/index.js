// Custom entry: register the FCM background message handler + notifee background
// event BEFORE the React app loads (they must be top-level, outside any
// component, or background/killed-state delivery is dropped). Then hand off to
// expo-router's normal entry. Mirrors the go-unbeaten setup.

import notifee, { EventType } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { displayFcmMessage } from "./lib/push";

// Background/killed: we send DATA-only FCM messages, so the OS does NOT
// auto-display them — this handler runs and notifee renders the rich card. Must
// return a Promise and must NOT touch React state.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const d = remoteMessage?.data ?? {};
  try {
    await displayFcmMessage({
      title: typeof d.title === "string" ? d.title : undefined,
      body: typeof d.body === "string" ? d.body : undefined,
      url: typeof d.url === "string" ? d.url : undefined,
    });
  } catch (e) {
    console.warn("[push] background display failed", e);
  }
});

// Background notifee events (a tap while the app is killed). The actual
// navigation happens on next launch via getInitialNotification in _layout; here
// we just need a registered handler so notifee doesn't warn.
notifee.onBackgroundEvent(async ({ type }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    // intentionally empty — routing handled on foreground (see _layout.tsx).
  }
});

// Hand off to expo-router.
import "expo-router/entry";
