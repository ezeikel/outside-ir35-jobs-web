import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { z } from "zod";
import FormField from "@/components/FormField";
import RichTextField from "@/components/RichTextField";
import { useAuth } from "@/contexts/AuthContext";
import { type PostJobInput, postJob } from "@/lib/api-jobs";
import { getJobPostPackage, purchasePackage } from "@/lib/revenuecat";

// Post a contract from mobile (posters only). Mirrors the web PostJobForm but
// mobile-focused: the description + how-to-apply are Enriched rich text (HTML out,
// round-trips with web TipTap). On submit the job is created PENDING via the
// shared createUnpaidJob primitive; payment then goes through RevenueCat (the
// mobile provider — Stripe is web-only per App Store rules) and the RC webhook
// publishes it. The RC purchase is the one piece still stubbed (RevenueCat isn't
// provisioned yet — see the TODO below).

const WORK_MODES = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ON_SITE", label: "On-site" },
] as const;

// Honest IR35 framing: we capture the CLIENT's stated position (attributed), and
// the poster must confirm it reflects the client's claim — we never assert it.
const IR35_SIGNALS = [
  { value: "CLIENT_INTENDS_OUTSIDE", label: "Client states outside IR35" },
  { value: "SDS_ISSUED", label: "SDS issued (outside)" },
  { value: "SMALL_CLIENT_EXEMPT", label: "Small-client exempt" },
  { value: "UNKNOWN", label: "Not stated yet" },
] as const;

const formSchema = z.object({
  companyName: z.string().trim().min(1, "Required"),
  position: z.string().trim().min(1, "Required"),
  keywords: z.string(),
  applicationEmail: z.string().trim().email("Enter a valid email"),
});

const PostJobScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Rich-text + picker fields live outside the TanStack form (the editor is
  // uncontrolled / native; pickers are simple state). The form validates the
  // plain text fields; submit assembles the full payload.
  const [description, setDescription] = useState("");
  const [howToApply, setHowToApply] = useState("");
  const [workMode, setWorkMode] =
    useState<PostJobInput["workMode"]>("REMOTE");
  const [ir35Signal, setIr35Signal] = useState("CLIENT_INTENDS_OUTSIDE");
  const [attested, setAttested] = useState(false);

  const post = useMutation({
    // 1) Create the unpaid (PENDING) job → get its id. 2) Purchase the one-time
    // job-post product via RevenueCat (StoreKit/Play). The RC webhook then flips
    // the poster's newest pending job → PAID + live (reconciled by app_user_id +
    // the store transaction id). DB is the source of truth — we don't trust the
    // client to mark it paid.
    mutationFn: async (input: PostJobInput) => {
      const { jobId } = await postJob(input);
      const pkg = await getJobPostPackage();
      if (!pkg) {
        throw new Error("Job-post payment isn’t available right now.");
      }
      const info = await purchasePackage(pkg);
      // null = the user cancelled the App Store sheet. The job stays PENDING (a
      // future "finish payment" can retry); treat as a soft no-op, not an error.
      return { jobId, purchased: info !== null };
    },
    onSuccess: (result) => {
      if (result.purchased) {
        toast.success("Payment received. Your contract is going live.");
        router.back();
      } else {
        toast("Saved as a draft. Finish payment to go live.");
      }
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (e instanceof Error ? e.message : "Couldn’t post the contract.");
      toast.error(msg);
    },
  });

  const form = useForm({
    defaultValues: {
      companyName: "",
      position: "",
      keywords: "",
      applicationEmail: "",
    },
    validators: { onChange: formSchema },
    onSubmit: ({ value }) => {
      if (!attested) {
        toast.error("Please confirm the IR35 position reflects the client.");
        return;
      }
      if (!description.trim()) {
        toast.error("Add a job description.");
        return;
      }
      post.mutate({
        companyName: value.companyName.trim(),
        position: value.position.trim(),
        description,
        howToApply: howToApply.trim() || description,
        keywords: value.keywords,
        applicationEmail: value.applicationEmail.trim(),
        workMode,
        ir35Signal,
        // Location is required by the API; mobile v1 ships a remote-first default
        // (Mapbox geocoder is the web flow — a follow-up adds it here).
        location: {
          address: "United Kingdom",
          placeId: "",
          coordinates: { lat: null, lng: null },
        },
        dayRate: [0],
      });
    },
  });

  // Posters only.
  if (user?.role !== "JOB_POSTER") {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center font-display text-2xl text-foreground">
          Posting is for hiring accounts
        </Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          Switch to a hiring account to post a contract.
        </Text>
        <Pressable
          className="mt-6 rounded-lg border border-border px-5 py-3 active:opacity-70"
          onPress={() => router.back()}
        >
          <Text className="font-sans-semibold text-foreground">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Keep the focused field (and the controls just below it) above the
        // keyboard so the bottom of the form stays reachable.
        bottomOffset={24}
      >
        <Text className="font-display text-3xl text-foreground">
          Post a contract
        </Text>
        <Text className="-mt-2 text-sm text-muted-foreground">
          Reach verified limited-company contractors. £219 per listing, live for
          30 days.
        </Text>

        <form.Field name="companyName">
          {(field) => (
            <FormField field={field} label="Company name" placeholder="Acme Ltd" />
          )}
        </form.Field>
        <form.Field name="position">
          {(field) => (
            <FormField
              field={field}
              label="Position"
              placeholder="Senior React Engineer"
            />
          )}
        </form.Field>

        <RichTextField
          label="Job description"
          placeholder="The role, the team, the tech, the contract length…"
          onChangeHtml={setDescription}
        />

        <RichTextField
          label="How to apply (optional)"
          placeholder="Application steps, or leave blank to reuse the description"
          onChangeHtml={setHowToApply}
        />

        <form.Field name="keywords">
          {(field) => (
            <FormField
              field={field}
              label="Keywords"
              placeholder="React, Node.js, AWS"
              autoCapitalize="none"
            />
          )}
        </form.Field>
        <form.Field name="applicationEmail">
          {(field) => (
            <FormField
              field={field}
              label="Application email"
              placeholder="jobs@acme.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        </form.Field>

        {/* Work mode */}
        <View className="gap-1">
          <Text className="text-xs font-sans-medium text-muted-foreground">
            Work mode
          </Text>
          <View className="flex-row gap-2">
            {WORK_MODES.map((m) => (
              <Pressable
                key={m.value}
                className={`flex-1 rounded-lg border px-3 py-2.5 active:opacity-80 ${
                  workMode === m.value
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
                }`}
                onPress={() => setWorkMode(m.value)}
              >
                <Text
                  className={`text-center text-sm font-sans-medium ${
                    workMode === m.value
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* IR35 signal — the CLIENT's stated position, never our assertion. */}
        <View className="gap-1">
          <Text className="text-xs font-sans-medium text-muted-foreground">
            Client’s IR35 position
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {IR35_SIGNALS.map((s) => (
              <Pressable
                key={s.value}
                className={`rounded-lg border px-3 py-2 active:opacity-80 ${
                  ir35Signal === s.value
                    ? "border-primary bg-secondary"
                    : "border-border bg-background"
                }`}
                onPress={() => setIr35Signal(s.value)}
              >
                <Text className="text-sm text-foreground">{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Attestation — honesty guard: poster confirms it's the client's claim. */}
        <Pressable
          className="mt-1 flex-row items-start gap-3 active:opacity-80"
          onPress={() => setAttested((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: attested }}
          accessibilityLabel="I confirm this reflects the client’s stated IR35 position"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              attested ? "border-primary bg-primary" : "border-border"
            }`}
          >
            {attested ? (
              <Text className="text-xs text-primary-foreground">✓</Text>
            ) : null}
          </View>
          <Text className="flex-1 text-sm text-muted-foreground">
            I confirm this reflects the client’s stated IR35 position. Outside IR35
            Jobs never asserts a role’s status.
          </Text>
        </Pressable>

        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <Pressable
              className={`mt-3 rounded-lg p-4 ${
                canSubmit && !post.isPending
                  ? "bg-primary active:opacity-90"
                  : "bg-ink-300"
              }`}
              disabled={!canSubmit || post.isPending}
              onPress={() => void form.handleSubmit()}
            >
              {post.isPending ? (
                <ActivityIndicator color="#fbfaf9" />
              ) : (
                <Text className="text-center font-sans-semibold text-primary-foreground">
                  Continue · £219
                </Text>
              )}
            </Pressable>
          )}
        </form.Subscribe>

        <Text className="text-center text-xs text-muted-foreground">
          Payment is taken through your App Store account. Your listing goes live
          once payment is confirmed.
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default PostJobScreen;
