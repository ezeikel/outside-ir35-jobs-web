import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Premium upsell shown when a non-premium contractor taps "Draft with AI". They've
// just experienced the value tease (the button is right there), so this is a clean
// paywall moment — explain what they get, one tap to upgrade, easy to dismiss.

const COLORS = {
  surface: "#ffffff",
  foreground: "#17181a",
  muted: "#767370",
  border: "#e8e7e5",
  primary: "#c2410c",
  primaryFg: "#fbfaf9",
  handle: "#d6d4d1",
  accentBg: "#fdf0e9",
};

type AIPitchUpsellProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

const PERKS = [
  "Tailored cover notes drafted from your CV for any role",
  "Rephrase, shorten or formalise in a tap",
  "Unlimited job alerts + AI on every match",
];

const AIPitchUpsell = ({ isOpen, onClose, onUpgrade }: AIPitchUpsellProps) => {
  const insets = useSafeAreaInsets();

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <ModalBottomSheet
      index={1}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handle} />
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.iconWrap}>
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              size={20}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.title}>Draft with AI is premium</Text>
          <Text style={styles.subtitle}>
            Turn your CV into a tailored pitch for this role in seconds — then
            edit it before you send.
          </Text>

          <View style={styles.perks}>
            {PERKS.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <Text style={styles.perkBullet}>✓</Text>
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.pressed,
            ]}
            onPress={onUpgrade}
            accessibilityRole="button"
            accessibilityLabel="Go premium"
          >
            <Text style={styles.upgradeText}>Go premium</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.maybeLater, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.maybeLaterText}>Not now</Text>
          </Pressable>
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
  content: { paddingHorizontal: 20, paddingTop: 8 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accentBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "InstrumentSerif-Regular",
    fontSize: 26,
    color: COLORS.foreground,
  },
  subtitle: {
    fontFamily: "InterTight-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
    marginTop: 6,
  },
  perks: { marginTop: 16, gap: 10 },
  perkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  perkBullet: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 14,
    color: COLORS.primary,
  },
  perkText: {
    flex: 1,
    fontFamily: "InterTight-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.foreground,
  },
  upgradeButton: {
    marginTop: 22,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  upgradeText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: COLORS.primaryFg,
  },
  maybeLater: { marginTop: 10, paddingVertical: 10, alignItems: "center" },
  maybeLaterText: {
    fontFamily: "InterTight-Medium",
    fontSize: 14,
    color: COLORS.muted,
  },
  pressed: { opacity: 0.7 },
});

export default AIPitchUpsell;
