import {
  faChevronRight,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Pressable, Text, View } from "react-native";

// A single tappable settings row: leading icon, title (+ optional subtitle), and
// a trailing chevron (or nothing for non-navigating rows). Rows group inside a
// SettingsSection card. `destructive` tints the title red (e.g. Sign out).
const SettingsRow = ({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  showChevron = true,
  isLast = false,
}: {
  icon?: IconDefinition;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
}) => {
  const titleColor = destructive ? "text-destructive" : "text-foreground";
  return (
    <Pressable
      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-70 ${
        isLast ? "" : "border-b border-border"
      }`}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {icon ? (
        <FontAwesomeIcon
          icon={icon}
          size={16}
          color={destructive ? "#cc2827" : "#767370"}
        />
      ) : null}
      <View className="min-w-0 flex-1">
        <Text className={`font-sans-medium text-base ${titleColor}`}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showChevron && onPress ? (
        <FontAwesomeIcon icon={faChevronRight} size={13} color="#a3a09e" />
      ) : null}
    </Pressable>
  );
};

// A titled group of rows rendered as a single card (matches the iOS grouped-list
// feel + the app's card styling).
export const SettingsSection = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <View className="mt-6">
    {title ? (
      <Text className="mb-2 px-1 text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
    ) : null}
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </View>
  </View>
);

export default SettingsRow;
