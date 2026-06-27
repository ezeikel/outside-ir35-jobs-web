import {
  faBriefcase,
  faClock,
  faLocationDot,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Text, View } from "react-native";
import type { MobileJobCard } from "@/lib/api-jobs";
import { formatDayRate, postedLabel } from "@/lib/format";

// The card a seeker swipes in the deck. It IS the whole decision surface, so it's
// built like a poster: a calm body that leads with the role + the money, a quiet
// company line, fact chips, and an always-true "Outside IR35 (client states)"
// trust badge pinned to the footer. Generous padding, strong type hierarchy, one
// clear focal point (the rate) — no dead space.
//
// Honesty (docs/ir35-trust-model.md): every job on the board now carries an
// outside-leaning client position (UNKNOWN/INSIDE are filtered server-side), so
// the badge shows the client's STATED position, attributed — never a platform
// "verified outside" claim.

const FactChip = ({
  icon,
  label,
}: {
  icon: typeof faClock;
  label: string;
}) => (
  <View className="flex-row items-center gap-1.5 rounded-full bg-secondary px-3 py-2">
    <FontAwesomeIcon icon={icon} size={12} color="#78716c" />
    <Text className="text-xs font-sans-medium text-foreground">{label}</Text>
  </View>
);

const JobSwipeCard = ({ job }: { job: MobileJobCard }) => {
  const initial = (job.companyName?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <View
      className="flex-1 overflow-hidden rounded-[28px] border border-border bg-card"
      style={{
        // Soft elevation so the top card lifts off the deck.
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      {/* Header: company avatar + name + posted. Quiet, sets context. */}
      <View className="flex-row items-center gap-3 px-6 pt-6">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
          <Text className="font-display text-lg text-foreground">{initial}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-sans-semibold text-base text-foreground"
            numberOfLines={1}
          >
            {job.companyName}
          </Text>
          <Text className="text-xs text-muted-foreground">
            Posted {postedLabel(job.postedAt)}
          </Text>
        </View>
      </View>

      {/* The role + the money — the focal point. Big, with breathing room. */}
      <View className="flex-1 justify-center px-6">
        <Text className="font-display text-[34px] leading-[40px] text-foreground">
          {job.position}
        </Text>
        <Text className="mt-4 font-sans-semibold font-mono text-3xl text-foreground">
          {formatDayRate(job.dayRate)}
        </Text>

        {/* Fact chips. */}
        <View className="mt-6 flex-row flex-wrap gap-2">
          <FactChip icon={faLocationDot} label={job.location} />
          <FactChip icon={faBriefcase} label={job.workModeLabel} />
          {job.contractLengthDays ? (
            <FactChip icon={faClock} label={`${job.contractLengthDays} days`} />
          ) : null}
        </View>
      </View>

      {/* Footer: the trust badge — the reason this board exists — + a swipe hint. */}
      <View className="gap-3 px-6 pb-6">
        <View className="flex-row items-center gap-2 self-start rounded-full bg-verified-muted px-3 py-2">
          <FontAwesomeIcon icon={faShieldHalved} size={13} color="#1f5d43" />
          <Text className="text-xs font-sans-semibold text-verified">
            {job.ir35Label}
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">
          Tap to read the full role · swipe to triage
        </Text>
      </View>
    </View>
  );
};

export default JobSwipeCard;
