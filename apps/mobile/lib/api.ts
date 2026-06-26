import axios, { type AxiosInstance } from "axios";
import { Platform } from "react-native";
import { getSessionToken } from "@/lib/auth";

// Base URL resolution. Prod is the live site; in dev each platform reaches the
// host machine differently (iOS sim → 127.0.0.1, Android emulator → 10.0.2.2).
// Port 3007 matches the web app's dev server (NEXTAUTH_URL). These loopback hosts
// only work on a SIMULATOR/EMULATOR — on a physical device set EXPO_PUBLIC_API_URL
// to the host machine's LAN IP (e.g. http://192.168.1.x:3007). EXPO_PUBLIC_API_URL
// also overrides for preview/staging builds.
const DEV_PORT = 3007;
const PROD_BASE_URL = "https://www.outsideir35.jobs";
const DEV_BASE_URL = Platform.select({
  ios: `http://127.0.0.1:${DEV_PORT}`,
  android: `http://10.0.2.2:${DEV_PORT}`,
  default: `http://127.0.0.1:${DEV_PORT}`,
});

const isDev = process.env.NODE_ENV !== "production";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (isDev ? DEV_BASE_URL : PROD_BASE_URL);

// Single axios instance. All mobile endpoints live under /api/mobile/* on the
// web app — thin HTTP wrappers over the server actions that are the source of
// truth (see apps/web: "server actions are the source of truth; routes wrap
// them"), so web + mobile share one implementation.
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

// Attach the bearer token when the user is signed in. Public endpoints (board,
// day-rates) work without it; authed endpoints (apply, alerts, premium) require
// it and the server 401s if it's missing/expired.
api.interceptors.request.use(async (config) => {
  const token = await getSessionToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
