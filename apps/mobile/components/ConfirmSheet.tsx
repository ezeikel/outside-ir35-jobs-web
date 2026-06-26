import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Brand-styled replacement for the iOS system Alert.alert([Cancel, Destroy])
// confirm. Destructive/irreversible actions get an in-app bottom sheet instead
// of dropping to the OS alert — keeps the experience on-brand (Inter Tight,
// our palette). Transient feedback (success/error) goes to sonner toasts; this
// is only for "are you sure?" confirms. (Mirrors the sibling apps' rule:
// no Alert.alert on mobile — toasts for feedback, a sheet for confirms.)

const COLORS = {
  surface: "#ffffff",
  foreground: "#17181a",
  muted: "#767370",
  border: "#e8e7e5",
  destructive: "#cc2827",
  destructiveFg: "#fefefe",
  handle: "#d6d4d1",
};

type ConfirmSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Label on the confirm button (e.g. "Remove", "Sign out", "Delete"). */
  confirmLabel: string;
  cancelLabel?: string;
  /** Tints the confirm button red when destructive (default), ink otherwise. */
  tone?: "destructive" | "default";
  onConfirm: () => void;
};

const ConfirmSheet = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
}: ConfirmSheetProps) => {
  const insets = useSafeAreaInsets();

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const handleConfirm = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm();
    onClose();
  };

  // Only mount while open — a ModalBottomSheet at index 0 stays mounted-but-
  // collapsed and its surface can peek above the bottom edge (reads as a
  // phantom dialog). Gating on isOpen removes the peek.
  if (!isOpen) return null;

  const confirmBg =
    tone === "destructive" ? COLORS.destructive : COLORS.foreground;

  return (
    <ModalBottomSheet
      index={1}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handle} />
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: confirmBg },
                pressed && styles.pressed,
              ]}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
    marginBottom: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  title: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 18,
    color: COLORS.foreground,
  },
  description: {
    fontFamily: "InterTight-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: COLORS.foreground,
  },
  confirmText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: COLORS.destructiveFg,
  },
});

export default ConfirmSheet;
