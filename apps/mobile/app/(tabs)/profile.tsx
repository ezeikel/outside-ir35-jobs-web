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

const ROLE_LABEL: Record<string, string> = {
  JOB_SEEKER: "Contractor",
  JOB_POSTER: "Hiring",
};

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
              Finish setting up — pick contractor or hiring to unlock your full
              profile.
            </Text>
            <Text className="mt-1 text-xs font-sans-semibold text-foreground">
              Set up now →
            </Text>
          </Pressable>
        ) : null}

        {/* The verified compliance pack (contractors only). */}
        {user.role === "JOB_SEEKER" ? <VerifiedProfile /> : null}

        {/* Posting entry (hiring accounts only — they have no board tab). */}
        {user.role === "JOB_POSTER" && user.onboarded ? (
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

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            title="Email"
            subtitle={user.email}
            showChevron={false}
          />
          {user.role && ROLE_LABEL[user.role] ? (
            <SettingsRow
              title="Account type"
              subtitle={ROLE_LABEL[user.role]}
              showChevron={false}
            />
          ) : null}
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
