// Affiliate partners: IR35 insurance + contract-review providers. This is the
// "safe trust signal" + an affiliate revenue line (docs/monetisation.md,
// ir35-trust-model.md #8). We surface partners; we never endorse a contractor's
// IR35 status or guarantee an outcome.
//
// Affiliate URLs come from env (PARTNER_<KEY>_URL) so real referral links aren't
// hardcoded; each falls back to the partner's plain homepage until a link is set.
// withAffiliateUrl() reads the env at call time (server-side).

export type PartnerCategory = 'insurance' | 'contract-review';

export type Partner = {
  key: string;
  name: string;
  category: PartnerCategory;
  blurb: string;
  // Plain homepage — used until an affiliate URL is configured.
  homepage: string;
  envKey: string; // env var holding the affiliate URL
};

export const PARTNERS: Partner[] = [
  {
    key: 'qdos',
    name: 'Qdos',
    category: 'insurance',
    blurb:
      'IR35 / tax-investigation insurance (TLC35) — covers tax, NIC, penalties and HMRC enquiry representation.',
    homepage: 'https://www.qdoscontractor.com',
    envKey: 'PARTNER_QDOS_URL',
  },
  {
    key: 'markel',
    name: 'Markel Tax',
    category: 'insurance',
    blurb:
      'Tax enquiry and IR35 cover, including representation in an HMRC investigation.',
    homepage: 'https://www.markeltax.co.uk',
    envKey: 'PARTNER_MARKEL_URL',
  },
  {
    key: 'kingsbridge',
    name: 'Kingsbridge',
    category: 'insurance',
    blurb:
      'Contractor insurance bundles including IR35 protection and professional indemnity.',
    homepage: 'https://www.kingsbridge.co.uk',
    envKey: 'PARTNER_KINGSBRIDGE_URL',
  },
  {
    key: 'qdos-review',
    name: 'Qdos Contract Review',
    category: 'contract-review',
    blurb:
      'Independent IR35 contract review by specialists — an evidenced opinion you can attach to a role.',
    homepage: 'https://www.qdoscontractor.com/ir35/contract-reviews',
    envKey: 'PARTNER_QDOS_REVIEW_URL',
  },
];

// Resolve a partner's outbound URL: the configured affiliate link, else the
// homepage. Reads env at call time so it's correct per-environment.
export const partnerUrl = (
  partner: Partner,
  env: Record<string, string | undefined> = process.env,
): string => env[partner.envKey]?.trim() || partner.homepage;

export const partnersByCategory = (category: PartnerCategory): Partner[] =>
  PARTNERS.filter((p) => p.category === category);
