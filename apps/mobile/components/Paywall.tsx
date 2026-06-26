import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { toast } from "sonner-native";
import { fetchPremium, usePremium } from "@/lib/api-premium";
import {
  getPremiumOffering,
  hasActiveEntitlement,
  purchasePackage,
  restorePurchases,
} from "@/lib/revenuecat";

// Premium paywall, mirroring the web /premium page. The contractor buys via
// StoreKit/Play (RevenueCat); on success we invalidate ["premium"] so the app
// re-reads the AUTHORITATIVE backend entitlement (the RC webhook will have
// written it). Already-premium contractors see the manage/active state instead.
// What premium ACTUALLY unlocks today (matches the enforced server gates). We
// don't list perks that aren't yet enforced — overstating would be dishonest,
// the same principle as the IR35 rule.
const PERKS = [
  "Unlimited saved searches & daily job alerts",
  "AI “why this matched” + a tailored pitch on every role",
  "Priority access to new features as we ship them",
];

const fmtDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const Paywall = () => {
  const queryClient = useQueryClient();
  const { isPremium, status, isLoading: premiumLoading } = usePremium();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [offeringLoaded, setOfferingLoaded] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let active = true;
    void getPremiumOffering()
      .then((offering) => {
        if (!active) return;
        const monthly =
          offering?.monthly ?? offering?.availablePackages?.[0] ?? null;
        setPkg(monthly);
        setPriceLabel(monthly?.product.priceString ?? null);
      })
      .finally(() => active && setOfferingLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // The RC webhook writes the DB entitlement asynchronously after a purchase, so
  // the authoritative /api/mobile/premium can lag a few seconds. Poll it with
  // backoff until isPremium flips (or we give up) instead of a single fixed wait.
  const pollUntilPremium = async () => {
    for (const delay of [0, 1500, 2000, 3000, 4000, 5000]) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const fresh = await queryClient.fetchQuery({
        queryKey: ["premium"],
        queryFn: fetchPremium,
      });
      if (fresh.isPremium) return true;
    }
    return false;
  };

  const buy = async () => {
    if (!pkg) {
      toast.error("Subscriptions aren’t available right now.");
      return;
    }
    setBuying(true);
    try {
      const info = await purchasePackage(pkg);
      if (!info) return; // user cancelled
      // Optimistic: RC says it's active immediately; the backend catches up via
      // the webhook, which pollUntilPremium waits for.
      if (hasActiveEntitlement(info)) {
        toast.success("You’re premium. Thanks!");
      }
      const confirmed = await pollUntilPremium();
      if (!confirmed) {
        toast.error(
          "Payment went through. Your premium will appear in a moment.",
        );
      }
    } catch {
      toast.error("Couldn’t complete the purchase.");
    } finally {
      setBuying(false);
    }
  };

  const restore = async () => {
    setBuying(true);
    try {
      const info = await restorePurchases();
      // Only claim success if an entitlement was actually restored.
      if (info && hasActiveEntitlement(info)) {
        await pollUntilPremium();
        toast.success("Subscription restored.");
      } else {
        toast.error("No previous subscription found for this account.");
      }
    } finally {
      setBuying(false);
    }
  };

  if (premiumLoading) {
    return (
      <View className="py-10">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  // Already premium — show the active/manage state.
  if (isPremium) {
    return (
      <View className="rounded-lg border border-verified bg-verified-muted p-5">
        <Text className="font-display text-2xl text-foreground">
          You’re premium
        </Text>
        <Text className="mt-1 text-sm text-foreground">
          {status?.cancelAtPeriodEnd
            ? `Ends on ${fmtDate(status.currentPeriodEnd)}.`
            : status?.currentPeriodEnd
              ? `Renews on ${fmtDate(status.currentPeriodEnd)}.`
              : "Your subscription is active."}
        </Text>
        {status?.provider === "REVENUECAT" ? (
          <Pressable
            className="mt-4 rounded-lg border border-border bg-card p-3 active:opacity-80"
            onPress={() =>
              Linking.openURL("https://apps.apple.com/account/subscriptions")
            }
          >
            <Text className="text-center font-sans-semibold text-foreground">
              Manage subscription
            </Text>
          </Pressable>
        ) : (
          <Text className="mt-3 text-xs text-muted-foreground">
            Manage this subscription on the web, where you started it.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text className="font-display text-3xl text-foreground">
        Win and deliver more contracts
      </Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        A business tool for limited-company contractors: unlimited job alerts
        and an AI explanation plus a tailored pitch for every matched role.
      </Text>

      <View className="mt-5 flex-row items-end">
        <Text className="font-display text-4xl text-foreground">
          {priceLabel ?? "£29"}
        </Text>
        {!priceLabel ? (
          <Text className="mb-1 ml-1 text-muted-foreground">/month</Text>
        ) : null}
      </View>

      <View className="mt-5 gap-3">
        {PERKS.map((perk) => (
          <View key={perk} className="flex-row items-start gap-3">
            <View className="mt-0.5">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size={18}
                color="#1f5d43"
              />
            </View>
            <Text className="flex-1 text-sm leading-5 text-foreground">
              {perk}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        className={`mt-7 rounded-lg p-4 ${pkg ? "bg-primary active:opacity-90" : "bg-ink-300"}`}
        disabled={!pkg || buying || !offeringLoaded}
        onPress={buy}
      >
        {buying ? (
          <ActivityIndicator color="#fbfaf9" />
        ) : (
          <Text className="text-center font-sans-semibold text-primary-foreground">
            {offeringLoaded && !pkg
              ? "Unavailable right now"
              : `Subscribe${priceLabel ? ` · ${priceLabel}/month` : " · £29/month"}`}
          </Text>
        )}
      </Pressable>

      <Pressable
        className="mt-3 p-2 active:opacity-70"
        disabled={buying}
        onPress={restore}
      >
        <Text className="text-center text-sm text-muted-foreground">
          Restore purchases
        </Text>
      </Pressable>

      <Text className="mt-4 text-center text-xs text-muted-foreground">
        Billed through your App Store / Google Play account. Cancel anytime in
        your store settings.
      </Text>
    </View>
  );
};

export default Paywall;
