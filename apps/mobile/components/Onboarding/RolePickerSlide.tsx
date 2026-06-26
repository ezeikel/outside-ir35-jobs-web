import { faApple, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import type { OnboardingInput } from "@/lib/api-account";

// The final onboarding slide: pick contractor (JOB_SEEKER) or hiring (JOB_POSTER)
// — hiring also picks direct vs recruiter — then sign in (Google/Apple) to attach
// the choice to an account. "Browse first" skips sign-in straight into the board.
// Mirrors the web /onboarding role picker, with sign-in moved here (onboarding is
// shown before sign-in on first launch).
const RolePickerSlide = ({
  isActive,
  submitting,
  alreadySignedIn,
  onPickRole,
  onSkip,
}: {
  isActive: boolean;
  submitting: boolean;
  alreadySignedIn: boolean;
  onPickRole: (input: OnboardingInput, provider: "google" | "apple") => void;
  onSkip: () => void;
}) => {
  const [role, setRole] = useState<"JOB_SEEKER" | "JOB_POSTER" | null>(null);
  const [posterType, setPosterType] = useState<"DIRECT" | "RECRUITER" | null>(
    null,
  );

  const ready =
    role === "JOB_SEEKER" || (role === "JOB_POSTER" && !!posterType);

  // The validated selection, or null if incomplete.
  const selection = (): OnboardingInput | null => {
    if (role === "JOB_SEEKER") return { role };
    if (role === "JOB_POSTER" && posterType) return { role, posterType };
    return null;
  };

  const signIn = (provider: "google" | "apple") => {
    const input = selection();
    if (input) onPickRole(input, provider);
  };

  return (
    <View
      className="flex-1 justify-center px-8"
      pointerEvents={isActive ? "auto" : "none"}
    >
      <Text className="text-center font-display text-3xl text-foreground">
        How will you use it?
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        One quick question so we can set you up. You can change this later.
      </Text>

      <View className="mt-8 gap-3">
        <Option
          title="I’m a contractor"
          subtitle="Build a verified profile and find Outside IR35 contracts."
          selected={role === "JOB_SEEKER"}
          onPress={() => {
            setRole("JOB_SEEKER");
            setPosterType(null);
          }}
        />
        <Option
          title="I’m hiring"
          subtitle="Post roles and reach verified limited-company contractors."
          selected={role === "JOB_POSTER"}
          onPress={() => setRole("JOB_POSTER")}
        />
      </View>

      {role === "JOB_POSTER" ? (
        <View className="mt-5">
          <Text className="text-sm font-sans-semibold text-foreground">
            Hiring directly or recruiting?
          </Text>
          <View className="mt-3 gap-3">
            <Option
              title="Hiring directly (end client)"
              selected={posterType === "DIRECT"}
              onPress={() => setPosterType("DIRECT")}
            />
            <Option
              title="Recruiter / agency"
              selected={posterType === "RECRUITER"}
              onPress={() => setPosterType("RECRUITER")}
            />
          </View>
        </View>
      ) : null}

      {/* Finish setup — enabled once a role is chosen. Already-signed-in users
          (came from the Profile "finish setting up" prompt) get a single
          "Get started"; first-launch users sign in with Google/Apple. */}
      <View className="mt-8 gap-3">
        {submitting ? (
          <View className="rounded-lg bg-primary p-4">
            <ActivityIndicator color="#fbfaf9" />
          </View>
        ) : alreadySignedIn ? (
          <Pressable
            className={`rounded-lg bg-primary p-4 ${ready ? "active:opacity-90" : "opacity-40"}`}
            disabled={!ready}
            onPress={() => signIn("google")}
          >
            <Text className="text-center font-sans-semibold text-primary-foreground">
              Get started
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              className={`flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 ${ready ? "active:opacity-80" : "opacity-40"}`}
              disabled={!ready}
              onPress={() => signIn("google")}
            >
              <FontAwesomeIcon icon={faGoogle} color="#17181a" size={18} />
              <Text className="font-sans-semibold text-foreground">
                Continue with Google
              </Text>
            </Pressable>

            {Platform.OS === "ios" ? (
              <Pressable
                className={`flex-row items-center justify-center gap-2 rounded-lg bg-primary p-4 ${ready ? "active:opacity-90" : "opacity-40"}`}
                disabled={!ready}
                onPress={() => signIn("apple")}
              >
                <FontAwesomeIcon icon={faApple} color="#fbfaf9" size={18} />
                <Text className="font-sans-semibold text-primary-foreground">
                  Sign in with Apple
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {/* Browse-first escape — explore the board without signing in. Hidden for
          an already-signed-in user (they just need to pick a role). */}
      {alreadySignedIn ? null : (
        <Pressable
          className="mt-5 p-2 active:opacity-70"
          disabled={submitting}
          onPress={onSkip}
        >
          <Text className="text-center text-sm text-muted-foreground">
            Browse first
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const Option = ({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-lg border p-4 ${
      selected ? "border-primary bg-secondary" : "border-border bg-card"
    }`}
  >
    <Text className="font-sans-semibold text-foreground">{title}</Text>
    {subtitle ? (
      <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
    ) : null}
  </Pressable>
);

export default RolePickerSlide;
