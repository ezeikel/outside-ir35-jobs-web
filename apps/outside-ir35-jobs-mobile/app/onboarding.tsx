import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { useAuth } from "@/contexts/AuthContext";
import { type OnboardingInput, submitOnboarding } from "@/lib/api-account";

// Role picker shown after first sign-in (mirrors the web /onboarding). Contractor
// (JOB_SEEKER) or hiring (JOB_POSTER); hiring also picks direct vs recruiter.
const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [role, setRole] = useState<"JOB_SEEKER" | "JOB_POSTER" | null>(null);
  const [posterType, setPosterType] = useState<"DIRECT" | "RECRUITER" | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    role === "JOB_SEEKER" || (role === "JOB_POSTER" && !!posterType);

  const submit = async () => {
    if (!role) return;
    if (role === "JOB_POSTER" && !posterType) return;
    setSubmitting(true);
    try {
      const input: OnboardingInput =
        role === "JOB_POSTER"
          ? { role, posterType: posterType as "DIRECT" | "RECRUITER" }
          : { role };
      await submitOnboarding(input);
      await refreshAuth();
      router.replace("/(tabs)");
    } catch {
      toast.error("Couldn’t save that — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="font-display text-3xl text-foreground">Welcome</Text>
      <Text className="mt-1 text-sm text-muted-foreground">
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
        <View className="mt-6">
          <Text className="text-sm font-sans-semibold text-foreground">
            Are you hiring directly or recruiting?
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

      <View className="flex-1" />

      <Pressable
        className={`rounded-lg p-4 ${canSubmit ? "bg-primary active:opacity-90" : "bg-ink-300"}`}
        disabled={!canSubmit || submitting}
        onPress={submit}
      >
        {submitting ? (
          <ActivityIndicator color="#fbfaf9" />
        ) : (
          <Text className="text-center font-sans-semibold text-primary-foreground">
            Continue
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

export default OnboardingScreen;
