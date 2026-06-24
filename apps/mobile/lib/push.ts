import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "@/lib/api";

// Push notifications — FCM transport + notifee display. Asks for permission,
// fetches the FCM token, registers it against the signed-in user via the bearer
// API, and renders incoming DATA-only FCM messages richly. Best-effort
// throughout — never throws into the UI. Mirrors the go-unbeaten setup.

// Must match the server's CHANNEL_ID in apps/web/lib/push/send.ts.
const ANDROID_CHANNEL = "alerts";
const INK = "#17181a";

const deviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// ---- Rich display (notifee) ------------------------------------------------

const ensureChannel = async (): Promise<string> =>
  notifee.createChannel({
    id: ANDROID_CHANNEL,
    name: "Job alerts",
    importance: AndroidImportance.HIGH,
    lightColor: INK,
  });

// Render an incoming FCM DATA message as a rich notification. We send data-only
// messages (so this handler always runs, iOS + Android, foreground + bg), with
// title/body/url in `data`. notifee draws the card + keeps `url` for the
// tap-to-deep-link.
export const displayFcmMessage = async (data: {
  title?: string;
  body?: string;
  url?: string;
}): Promise<void> => {
  const channelId = await ensureChannel();
  await notifee.displayNotification({
    title: data.title ?? "Outside IR35 Jobs",
    body: data.body ?? "",
    data: { url: data.url ?? "" },
    android: {
      channelId,
      color: INK,
      pressAction: { id: "default" },
    },
    ios: {},
  });
};

// ---- Permission + token registration ---------------------------------------

const hasPermission = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  // notifee owns the Android 13+ POST_NOTIFICATIONS permission (the one that
  // gates display). On iOS, messaging() reflects APNs auth.
  if (Platform.OS === "android") {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }
  const status = await messaging().hasPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// POST the FCM token to the server (bearer-authed via the api client). Returns
// true on success.
const sendSubscription = async (fcmToken: string): Promise<boolean> => {
  try {
    await api.post("/api/mobile/push/subscribe", {
      fcmToken,
      platform: Platform.OS,
      timezone: deviceTimezone(),
    });
    return true;
  } catch {
    return false;
  }
};

let refreshUnsub: (() => void) | null = null;

/**
 * Ask for permission (if needed), get the FCM token, register it, and keep it
 * fresh on rotation. Call after sign-in (so the bearer token exists). Returns
 * true if a token was registered. No-ops on a simulator / when denied.
 */
export const registerForPush = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  try {
    const granted = (await hasPermission()) || (await requestPermission());
    if (!granted) return false;

    // iOS needs the device registered for remote messages before getToken.
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    if (!token) return false;
    await sendSubscription(token);

    // Re-register when FCM rotates the token.
    if (!refreshUnsub) {
      refreshUnsub = messaging().onTokenRefresh((next) => {
        void sendSubscription(next);
      });
    }
    return true;
  } catch {
    return false;
  }
};
