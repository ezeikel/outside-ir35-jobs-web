import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Token storage for the mobile session. Unlike the sibling apps, this app has no
// anonymous-device concept: browsing the board is public + unauthenticated, and
// anything that mutates (apply, save a search, subscribe) requires a real
// Google/Apple sign-in. So we persist only what identifies a signed-in user: the
// opaque session token the server mints, plus the userId for convenience.
//
// SecureStore on native (iOS Keychain / Android encrypted prefs); AsyncStorage
// on web (SecureStore is native-only). The token is a bearer credential, so it
// MUST live in SecureStore on device — never AsyncStorage on native.

const SESSION_TOKEN_KEY = "oir35_session_token";
const USER_ID_KEY = "oir35_user_id";

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export const getSessionToken = (): Promise<string | null> =>
  storage.getItem(SESSION_TOKEN_KEY);

export const getUserId = (): Promise<string | null> =>
  storage.getItem(USER_ID_KEY);

/** Persist the session after a successful sign-in. */
export const setSession = async (token: string, userId: string): Promise<void> => {
  await Promise.all([
    storage.setItem(SESSION_TOKEN_KEY, token),
    storage.setItem(USER_ID_KEY, userId),
  ]);
};

/** Clear the session (sign-out). */
export const clearSession = async (): Promise<void> => {
  await Promise.all([
    storage.deleteItem(SESSION_TOKEN_KEY),
    storage.deleteItem(USER_ID_KEY),
  ]);
};
