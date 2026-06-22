import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { OnboardingInput } from "@/lib/api-account";

// The final onboarding slide: pick contractor (JOB_SEEKER) or hiring (JOB_POSTER)
// — hiring also picks direct vs recruiter. Mirrors the web /onboarding role
// picker. Calls onSubmit with the validated selection.
const RolePickerSlide = ({
  isActive,
  submitting,
  onSubmit,
}: {
  isActive: boolean;
  submitting: boolean;
  onSubmit: (input: OnboardingInput) => void;
}) => {
  const [role, setRole] = useState<"JOB_SEEKER" | "JOB_POSTER" | null>(null);
  const [posterType, setPosterType] = useState<"DIRECT" | "RECRUITER" | null>(
    null,
  );

  const canSubmit =
    role === "JOB_SEEKER" || (role === "JOB_POSTER" && !!posterType);

  const submit = () => {
    if (role === "JOB_SEEKER") onSubmit({ role });
    else if (role === "JOB_POSTER" && posterType)
      onSubmit({ role, posterType });
  };

  return (
    <View className="flex-1 justify-center px-8" pointerEvents={isActive ? "auto" : "none"}>
      <Text className="text-center font-display text-3xl text-foreground">
        How will you use it?
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        One quick question so we can set you up. You can change this later.
      </Text>

      <View className="mt-8 gap-3">
        <Option
          title="I’m a contractor"
          subtitle="Build a verified profile and find outside-IR35 contracts."
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

      <Pressable
        className={`mt-8 rounded-lg p-4 ${canSubmit ? "bg-primary active:opacity-90" : "bg-ink-300"}`}
        disabled={!canSubmit || submitting}
        onPress={submit}
      >
        {submitting ? (
          <ActivityIndicator color="#fbfaf9" />
        ) : (
          <Text className="text-center font-sans-semibold text-primary-foreground">
            Get started
          </Text>
        )}
      </Pressable>
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
