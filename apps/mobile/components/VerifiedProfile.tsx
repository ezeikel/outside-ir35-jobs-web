import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text, View } from "react-native";
import DocumentUpload from "@/components/DocumentUpload";
import { fetchProfile, type MobileProfile } from "@/lib/api-profile";

// The contractor's verified compliance pack. Surfaces only objective facts: the
// trust tier, register-checked companies (attributed + dated), documents on file
// with expiry, IR35 insurance, right-to-work — never an IR35 assertion
// (docs/ir35-trust-model.md). Documents are uploadable in-app; company
// verification + IR35-insurance editing still live on web.
const VerifiedProfile = () => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  if (isLoading) {
    return (
      <View className="py-8">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="mt-6 rounded-lg border border-dashed border-border bg-card p-5">
        <Text className="font-display text-xl text-foreground">
          Build your verified profile
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Verify your company once and stop re-sending the same compliance pack
          to every agency. Set it up on the web to get started.
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-6">
      <TrustTier profile={profile} />
      <Companies profile={profile} />
      <Documents profile={profile} />
      <DocumentUpload profile={profile} />
      <Compliance profile={profile} />
      <Text className="mt-6 text-center text-xs text-muted-foreground">
        These are objective, checkable facts. The platform never determines or
        warrants a role’s IR35 status.
      </Text>
    </View>
  );
};

const dateLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB") : "—";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="mt-5">
    <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </Text>
    {children}
  </View>
);

const TrustTier = ({ profile }: { profile: MobileProfile }) => (
  <View className="rounded-lg border border-border bg-card p-4">
    <Text className="text-xs uppercase tracking-wide text-muted-foreground">
      Trust level
    </Text>
    <View className="mt-1 flex-row items-center gap-2">
      <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-sans-semibold text-secondary-foreground">
        {profile.trustTierShort}
      </Text>
      <Text className="font-display text-xl text-foreground">
        {profile.trustTierLabel}
      </Text>
    </View>
  </View>
);

const Companies = ({ profile }: { profile: MobileProfile }) => {
  if (profile.companies.length === 0) {
    return (
      <Section title="Limited company">
        <Text className="text-sm text-muted-foreground">
          No company added yet.
        </Text>
      </Section>
    );
  }
  return (
    <Section title="Limited company">
      {profile.companies.map((c) => (
        <View
          key={c.id}
          className="mb-2 rounded-lg border border-border bg-card p-4"
        >
          <Text className="font-sans-semibold text-foreground">{c.name}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Company no. {c.incorporationNumber} · VAT {c.vatNumber}
          </Text>
          <View className="mt-2 gap-1">
            <CheckLine
              label="Companies House"
              verifiedAt={c.companyVerifiedAt}
            />
            <CheckLine label="VAT register" verifiedAt={c.vatVerifiedAt} />
          </View>
        </View>
      ))}
    </Section>
  );
};

// An attributed register check: green when the gov API confirmed it (with the
// date), muted when not yet checked. Never a claim beyond what was confirmed.
const CheckLine = ({
  label,
  verifiedAt,
}: {
  label: string;
  verifiedAt: string | null;
}) =>
  verifiedAt ? (
    <Text className="text-xs text-verified">
      ✓ {label} — confirmed {dateLabel(verifiedAt)}
    </Text>
  ) : (
    <Text className="text-xs text-muted-foreground">
      {label} — not yet checked
    </Text>
  );

const Documents = ({ profile }: { profile: MobileProfile }) => {
  if (profile.documents.length === 0) {
    return (
      <Section title="Compliance pack">
        <Text className="text-sm text-muted-foreground">
          No documents on file yet.
        </Text>
      </Section>
    );
  }
  return (
    <Section title="Compliance pack">
      {profile.documents.map((d) => (
        <View
          key={d.id}
          className="mb-2 flex-row items-center justify-between rounded-lg border border-border bg-card p-4"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-sans-semibold text-foreground">
              {d.typeLabel}
            </Text>
            {d.insurer ? (
              <Text className="text-xs text-muted-foreground">
                {d.insurer}
                {d.coverLimit
                  ? ` · £${d.coverLimit.toLocaleString("en-GB")} cover`
                  : ""}
              </Text>
            ) : null}
            {d.expiresAt ? (
              <Text className="text-xs text-muted-foreground">
                Expires {dateLabel(d.expiresAt)}
              </Text>
            ) : null}
          </View>
          <DocStatusBadge status={d.status} label={d.statusLabel} />
        </View>
      ))}
    </Section>
  );
};

const DocStatusBadge = ({
  status,
  label,
}: {
  status: string;
  label: string;
}) => {
  const tone =
    status === "ON_FILE"
      ? "bg-verified-muted text-verified"
      : status === "EXPIRING"
        ? "bg-aging-muted text-aging"
        : status === "FAILED"
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary text-muted-foreground";
  return (
    <Text className={`rounded-full px-2 py-1 text-xs ${tone}`}>{label}</Text>
  );
};

const Compliance = ({ profile }: { profile: MobileProfile }) => (
  <Section title="Compliance">
    <View className="gap-2">
      <View className="flex-row items-center justify-between rounded-lg border border-border bg-card p-4">
        <Text className="text-sm text-foreground">Right to work</Text>
        <Text
          className={`text-sm ${profile.rightToWorkConfirmed ? "text-verified" : "text-muted-foreground"}`}
        >
          {profile.rightToWorkConfirmed ? "Confirmed" : "Not confirmed"}
        </Text>
      </View>
      <View className="flex-row items-center justify-between rounded-lg border border-border bg-card p-4">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-sm text-foreground">IR35 insurance</Text>
          {profile.ir35Insurance.held && profile.ir35Insurance.provider ? (
            <Text className="text-xs text-muted-foreground">
              {profile.ir35Insurance.provider}
              {profile.ir35Insurance.expiresAt
                ? ` · expires ${dateLabel(profile.ir35Insurance.expiresAt)}`
                : ""}
            </Text>
          ) : null}
        </View>
        <Text
          className={`text-sm ${profile.ir35Insurance.held ? "text-verified" : "text-muted-foreground"}`}
        >
          {profile.ir35Insurance.held ? "Held" : "Not held"}
        </Text>
      </View>
    </View>
  </Section>
);

export default VerifiedProfile;
