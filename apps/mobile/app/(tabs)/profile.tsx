import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
  faEnvelope,
  faFileLines,
  faPlus,
  faRightFromBracket,
  faShieldHalved,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import * as Application from "expo-application";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import SettingsRow, { SettingsSection } from "@/components/SettingsRow";
import VerifiedProfile from "@/components/VerifiedProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/hooks/useViewMode";
import type { ViewMode } from "@/stores/viewModeStore";

const SITE = "https://www.outsideir35.jobs";
const SUPPORT_EMAIL = "hello@chewybytes.com";
const ASC_APP_ID = "6784110879";

// "1.0.0 (3)" — native version + build number, falling back to the JS-config
// version if the native values aren't available (e.g. Expo Go, which we don't
// ship, but be safe).
const versionLabel = (): string => {
  const v = Application.nativeApplicationVersion ?? "1.0.0";
  const b = Application.nativeBuildVersion;
  return b ? `${v} (${b})` : v;
};

// Seeker / Hiring segmented control. Switching changes which experience the whole
// app shows (tabs + actions) — the backend lets any onboarded user do both.
const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "seeker", label: "Looking for work" },
  { value: "hiring", label: "Hiring" },
];

const ModeSwitch = ({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) => (
  <View className="flex-row gap-2 p-3">
    {MODE_OPTIONS.map((opt) => {
      const active = mode === opt.value;
      return (
        <Pressable
          key={opt.value}
          className={`flex-1 rounded-lg border px-3 py-2.5 active:opacity-80 ${
            active ? "border-primary bg-primary" : "border-border bg-background"
          }`}
          onPress={() => onChange(opt.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={opt.label}
        >
          <Text
            className={`text-center text-sm font-sans-medium ${
              active ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

// Profile tab: sign-in entry (Google + Apple) when signed out; account + the
// verified compliance pack (contractors) when signed in.
const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isLoading,
    isAuthenticated,
    user,
    signInWithGoogleHandler,
    signInWithAppleHandler,
    signOut,
  } = useAuth();
  const { mode, setMode } = useViewMode();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24 + TAB_BAR_HEIGHT,
        }}
      >
        <Text className="font-display text-3xl text-foreground">
          {user.name || "Your account"}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">{user.email}</Text>

        {!user.onboarded ? (
          <Pressable
            className="mt-4 rounded-lg border border-aging bg-aging-muted p-3 active:opacity-80"
            onPress={() => router.push("/onboarding")}
          >
            <Text className="text-sm text-foreground">
              Finish setting up. Pick contractor or hiring to unlock your full
              profile.
            </Text>
            <Text className="mt-1 text-xs font-sans-semibold text-foreground">
              Set up now →
            </Text>
          </Pressable>
        ) : null}

        {/* The verified compliance pack (seeker view). */}
        {user.onboarded && mode === "seeker" ? <VerifiedProfile /> : null}

        {/* Posting entry (hiring view). */}
        {user.onboarded && mode === "hiring" ? (
          <Pressable
            className="mt-6 flex-row items-center justify-center gap-2 rounded-lg bg-primary p-4 active:opacity-90"
            onPress={() => router.push("/post-job")}
            accessibilityRole="button"
            accessibilityLabel="Post a contract"
          >
            <FontAwesomeIcon icon={faPlus} color="#fbfaf9" size={16} />
            <Text className="font-sans-semibold text-primary-foreground">
              Post a contract
            </Text>
          </Pressable>
        ) : null}

        {/* Premium entry (seeker view) — the paywall moved off the tab bar; this
            is its home, plus contextual paywall moments elsewhere. */}
        {user.onboarded && mode === "seeker" ? (
          <SettingsSection title="Premium">
            <SettingsRow
              icon={faStar}
              title="Go premium"
              subtitle="Unlimited alerts + AI pitch on every match"
              onPress={() => router.push("/premium")}
              isLast
            />
          </SettingsSection>
        ) : null}

        {/* View mode — switch between finding work and hiring. Only relevant
            once onboarded (a default role exists). */}
        {user.onboarded ? (
          <SettingsSection title="I'm here to">
            <ModeSwitch mode={mode} onChange={setMode} />
          </SettingsSection>
        ) : null}

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            title="Email"
            subtitle={user.email}
            showChevron={false}
          />
          <SettingsRow
            icon={faRightFromBracket}
            title="Sign out"
            onPress={signOut}
            destructive
            showChevron={false}
            isLast
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsRow
            icon={faEnvelope}
            title="Contact us"
            subtitle={SUPPORT_EMAIL}
            onPress={() =>
              Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=Outside%20IR35%20Jobs%20app`,
              )
            }
          />
          <SettingsRow
            icon={faStar}
            title="Rate the app"
            onPress={() =>
              Linking.openURL(
                `itms-apps://apps.apple.com/app/id${ASC_APP_ID}?action=write-review`,
              )
            }
          />
          <SettingsRow
            icon={faShieldHalved}
            title="Privacy policy"
            onPress={() => Linking.openURL(`${SITE}/privacy`)}
          />
          <SettingsRow
            icon={faFileLines}
            title="Terms of service"
            onPress={() => Linking.openURL(`${SITE}/terms`)}
            isLast
          />
        </SettingsSection>

        {/* Version footer */}
        <View className="mt-8 items-center gap-1">
          <Text className="text-xs text-muted-foreground">
            Outside IR35 Jobs
          </Text>
          <Text className="text-xs text-muted-foreground">
            Version {versionLabel()}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      <Text className="font-display text-3xl text-foreground">Sign in</Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        Sign in to apply with your verified profile, save searches, and get
        alerts for new Outside IR35 contracts.
      </Text>

      <View className="mt-8 gap-3">
        <Pressable
          className="flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 active:opacity-80"
          onPress={signInWithGoogleHandler}
        >
          <FontAwesomeIcon icon={faGoogle} color="#17181a" size={18} />
          <Text className="font-sans-semibold text-foreground">
            Continue with Google
          </Text>
        </Pressable>

        {Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={{ height: 52 }}
            onPress={signInWithAppleHandler}
          />
        ) : null}
      </View>
    </View>
  );
};

export default ProfileScreen;
