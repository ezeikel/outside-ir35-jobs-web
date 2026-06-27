import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type DayRateRow, fetchDayRates } from "@/lib/api-day-rates";

// Day-rate benchmarks — median UK day rates by skill, split by the IR35 position
// each listing STATES (never our assertion). The server hard-gates on a minimum
// sample, so a rate only ever appears once enough listings back it (honesty —
// docs/ir35-trust-model.md). Mirrors the web /day-rates page.
const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;

const DayRatesScreen = () => {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dayRates"],
    queryFn: fetchDayRates,
  });

  const Header = (
    <View className="px-1 pb-2 pt-2">
      <Text className="text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
        Market data
      </Text>
      <Text className="mt-1 font-display text-3xl text-foreground">
        Contract day rates
      </Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        Median UK day rates by skill, from contracts aggregated on this board,
        split by the IR35 position each listing states. We never assert a role’s
        IR35 status; we only report what the listing claims.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-4 pt-2">
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#17181a" />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 bg-background px-4 pt-2">
        {Header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-muted-foreground">
            Couldn’t load day rates. Pull to retry.
          </Text>
        </View>
      </View>
    );
  }

  // Gated empty state — mirrors the web copy + the real MIN_SAMPLE threshold.
  if (data.rows.length === 0) {
    return (
      <View className="flex-1 bg-background px-4 pt-2">
        {Header}
        <View className="mt-4 rounded-lg border border-dashed border-border bg-card/50 p-8">
          <Text className="text-center font-display text-2xl text-foreground">
            Not enough data yet
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            We publish a day rate only once a skill has at least {data.minSample}{" "}
            live listings, so the numbers mean something. The board is still
            filling. Check back soon.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={data.rows}
        keyExtractor={(r) => `${r.skill}-${r.ir35Bucket}`}
        renderItem={({ item }) => <RateRow row={item} />}
        ListHeaderComponent={Header}
        ListFooterComponent={<Disclaimer totalSample={data.totalSample} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </View>
  );
};

const RateRow = ({ row }: { row: DayRateRow }) => (
  <View className="mb-2 rounded-lg border border-border bg-card p-4">
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text className="font-sans-semibold text-foreground" numberOfLines={1}>
          {row.skillLabel}
        </Text>
        <Text
          className={`mt-0.5 text-xs ${row.tone === "verified" ? "text-verified" : "text-muted-foreground"}`}
        >
          {row.ir35Label}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-sans-semibold font-mono text-lg text-foreground">
          {fmt(row.median)}
        </Text>
        <Text className="font-mono text-xs text-muted-foreground">
          {fmt(row.p25)}–{fmt(row.p75)}
        </Text>
      </View>
    </View>
    <Text className="mt-2 text-xs text-muted-foreground">
      Median of {row.sampleSize} listing{row.sampleSize === 1 ? "" : "s"} · range{" "}
      {fmt(row.min)}–{fmt(row.max)}
    </Text>
  </View>
);

const Disclaimer = ({ totalSample }: { totalSample: number }) => (
  <Text className="mt-3 px-1 text-xs leading-5 text-muted-foreground">
    Based on {totalSample} live listing{totalSample === 1 ? "" : "s"} aggregated
    on this board, grouped by skill and the IR35 position the listing states. Day
    rates are midpoints of any stated range. This is a snapshot of current
    listings, not a market authority. Sanity-check against your own sources.
  </Text>
);

export default DayRatesScreen;
