import axios, { type AxiosInstance } from "axios";
import { Platform } from "react-native";
import { getSessionToken } from "@/lib/auth";

// Base URL resolution. Prod is the live site; in dev each platform reaches the
// host machine differently (iOS sim → 127.0.0.1, Android emulator → 10.0.2.2).
// Override with EXPO_PUBLIC_API_URL for a device on the LAN or a preview build.
const PROD_BASE_URL = "https://www.outsideir35.jobs";
const DEV_BASE_URL = Platform.select({
  ios: "http://127.0.0.1:3000",
  android: "http://10.0.2.2:3000",
  default: "http://127.0.0.1:3000",
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
