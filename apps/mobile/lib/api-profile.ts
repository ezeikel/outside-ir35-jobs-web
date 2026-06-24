import { api } from "@/lib/api";

// The contractor's verified compliance pack (the moat). Read-only on mobile for
// now — upload comes later. Mirrors the web profile's honest data model.

export type MobileProfile = {
  id: string;
  name: string;
  email: string;
  trustTier: string;
  trustTierLabel: string;
  trustTierShort: string;
  rightToWorkConfirmed: boolean;
  ir35Insurance: {
    held: boolean;
    provider: string | null;
    expiresAt: string | null;
  };
  companies: {
    id: string;
    name: string;
    vatNumber: string;
    incorporationNumber: string;
    companyVerifiedAt: string | null;
    vatVerifiedAt: string | null;
  }[];
  documents: {
    id: string;
    type: string;
    typeLabel: string;
    status: string;
    statusLabel: string;
    insurer: string | null;
    coverLimit: number | null;
    expiresAt: string | null;
  }[];
};

export const fetchProfile = async (): Promise<MobileProfile | null> => {
  const { data } = await api.get<{ profile: MobileProfile | null }>(
    "/api/mobile/profile",
  );
  return data.profile;
};
