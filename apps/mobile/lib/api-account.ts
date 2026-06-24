import type { AuthUser } from "@/lib/api-auth";
import { api } from "@/lib/api";

// Onboarding: a freshly-signed-in user picks contractor (JOB_SEEKER) or hiring
// (JOB_POSTER). Mirrors the web setUserRole action.

export type OnboardingInput =
  | { role: "JOB_SEEKER" }
  | { role: "JOB_POSTER"; posterType: "DIRECT" | "RECRUITER" };

export const submitOnboarding = async (
  input: OnboardingInput,
): Promise<AuthUser> => {
  const { data } = await api.post<{ user: AuthUser }>(
    "/api/mobile/onboarding",
    input,
  );
  return data.user;
};
