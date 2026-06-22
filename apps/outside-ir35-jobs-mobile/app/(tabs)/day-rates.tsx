import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Day-rate benchmark. Placeholder until the /api/mobile/day-rates endpoint +
// chart land (next phase) — the web benchmark is gated on a minimum sample, so
// mobile will mirror that honesty gate rather than show thin data.
const DayRatesScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      <Text className="font-display text-3xl text-foreground">Day rates</Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        Outside-IR35 day-rate benchmarks by skill — coming to mobile next.
      </Text>
    </View>
  );
};

export default DayRatesScreen;
