import {
  faBuildingColumns,
  faCircleCheck,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Text, View } from "react-native";
import type { CandidateCard } from "@/lib/api-applicants";

// The card a recruiter swipes in the candidate deck. It shows ONLY objective,
// self-attested facts about the contractor — trust tier (which verifications
// passed), the contractor's own stated headline/skills/seniority, register-
// verified companies, and on-file compliance flags. NEVER a platform score,
// ranking, or "match %": the poster is shortlisting their OWN applicants on
// checkable facts, not acting on a judgement we made (docs/ir35-trust-model.md).

const Fact = ({
  icon,
  label,
  on,
}: {
  icon: typeof faShieldHalved;
  label: string;
  on: boolean;
}) => (
  <View className="flex-row items-center gap-1.5 rounded-full bg-secondary px-3 py-2">
    <FontAwesomeIcon icon={icon} size={12} color={on ? "#1f5d43" : "#a3a09e"} />
    <Text
      className={`text-xs font-sans-medium ${on ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label}
    </Text>
  </View>
);

const SkillChip = ({ label }: { label: string }) => (
  <View className="rounded-full border border-border px-3 py-1.5">
    <Text className="text-xs text-foreground">{label}</Text>
  </View>
);

const CandidateSwipeCard = ({ candidate }: { candidate: CandidateCard }) => {
  const initial = (candidate.name?.trim()?.[0] ?? "?").toUpperCase();
  const verified = candidate.verifiedCompanies[0];

  return (
    <View
      className="flex-1 overflow-hidden rounded-[28px] border border-border bg-card"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      {/* Header: avatar, name, trust tier (attributed status, not a score). */}
      <View className="flex-row items-center gap-3 px-6 pt-6">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Text className="font-display text-xl text-foreground">{initial}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-display text-2xl text-foreground"
            numberOfLines={1}
          >
            {candidate.name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5 self-start rounded-full bg-verified-muted px-2.5 py-1">
            <FontAwesomeIcon icon={faShieldHalved} size={11} color="#1f5d43" />
            <Text className="text-xs font-sans-semibold text-verified">
              {candidate.trustTierLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-6 pt-5">
        {/* Seniority + experience line (the contractor's own words). */}
        {candidate.seniority || candidate.yearsExperience ? (
          <Text className="text-sm font-sans-medium text-muted-foreground">
            {[
              candidate.seniority,
              candidate.yearsExperience
                ? `${candidate.yearsExperience} yrs experience`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}

        {/* Headline — their stated summary. */}
        {candidate.headline ? (
          <Text
            className="mt-2 text-base leading-6 text-foreground"
            numberOfLines={4}
          >
            {candidate.headline}
          </Text>
        ) : null}

        {/* Skills (their own terms). */}
        {candidate.skills.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {candidate.skills.map((s) => (
              <SkillChip key={s} label={s} />
            ))}
          </View>
        ) : null}

        {/* Cover note, if they left one. */}
        {candidate.message ? (
          <View className="mt-4 rounded-xl border border-border bg-background p-3">
            <Text className="text-xs font-sans-medium text-muted-foreground">
              Their note
            </Text>
            <Text
              className="mt-1 text-sm leading-5 text-foreground"
              numberOfLines={3}
            >
              {candidate.message}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Footer: checkable compliance facts + a verified company line. */}
      <View className="gap-3 px-6 pb-6 pt-2">
        <View className="flex-row flex-wrap gap-2">
          <Fact
            icon={faCircleCheck}
            label="IR35 insurance"
            on={candidate.holdsIR35Insurance}
          />
          <Fact
            icon={faCircleCheck}
            label="Right to work"
            on={candidate.rightToWorkConfirmed}
          />
        </View>
        {verified ? (
          <View className="flex-row items-center gap-2">
            <FontAwesomeIcon
              icon={faBuildingColumns}
              size={12}
              color="#78716c"
            />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {verified.name} · register-verified
            </Text>
          </View>
        ) : null}
        <Text className="text-xs text-muted-foreground">
          Verified facts the contractor provided · swipe to triage
        </Text>
      </View>
    </View>
  );
};

export default CandidateSwipeCard;
