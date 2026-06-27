import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Pressable, Text, View } from "react-native";

// Shared "something went wrong, try again" state. Used wherever a data fetch can
// fail (board, day rates, saved jobs, applications, alerts). A real retry button
// beats "pull to retry" copy on a view that often has nothing to pull, and it
// keeps the failure honest — a failed fetch must never fall through to an empty
// state that reads as "you have nothing" (it lies about why the list is empty).

const ErrorState = ({
  title = "Something went wrong",
  body = "We couldn’t load this. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) => (
  <View className="flex-1 items-center justify-center px-10">
    <FontAwesomeIcon icon={faTriangleExclamation} size={40} color="#a3a09e" />
    <Text className="mt-5 font-display text-2xl text-foreground">{title}</Text>
    <Text className="mt-2 text-center text-sm text-muted-foreground">
      {body}
    </Text>
    {onRetry ? (
      <Pressable
        className="mt-6 rounded-lg border border-border bg-card px-5 py-3 active:opacity-70"
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text className="font-sans-semibold text-foreground">Try again</Text>
      </Pressable>
    ) : null}
  </View>
);

export default ErrorState;
