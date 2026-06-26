import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import VerifiedProfile from "@/components/VerifiedProfile";
import { useAuth } from "@/contexts/AuthContext";

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
          <View className="mt-4 rounded-lg border border-aging bg-aging-muted p-3">
            <Text className="text-sm text-foreground">
              Finish setting up your account to pick contractor or hiring — then
              the full profile unlocks here.
            </Text>
          </View>
        ) : null}

        {/* The verified compliance pack (contractors only). */}
        {user.role === "JOB_SEEKER" ? <VerifiedProfile /> : null}

        {/* Posting entry (hiring accounts only — they have no board tab). */}
        {user.role === "JOB_POSTER" && user.onboarded ? (
          <Pressable
            className="mt-6 flex-row items-center justify-center gap-2 rounded-lg bg-primary p-4 active:opacity-90"
            onPress={() => router.push("/post-job")}
          >
            <FontAwesomeIcon icon={faPlus} color="#fbfaf9" size={16} />
            <Text className="font-sans-semibold text-primary-foreground">
              Post a contract
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          className="mt-8 rounded-lg border border-border bg-card p-4 active:opacity-80"
          onPress={signOut}
        >
          <Text className="text-center font-sans-semibold text-foreground">
            Sign out
          </Text>
        </Pressable>
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
        alerts for new outside-IR35 contracts.
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
