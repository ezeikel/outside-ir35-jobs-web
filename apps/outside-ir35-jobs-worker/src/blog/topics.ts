/**
 * The blog topic catalogue. The cron picks a random UNCOVERED topic each run
 * (dedup via Sanity generationMeta.topic). Hand-seeded — a long runway of
 * outside-IR35 / contracting topics.
 *
 * `category` drives the post's honesty handling:
 *   - 'ir35-guidance' → the post MUST carry the never-assert disclaimer
 *     (validator enforces) and cite primary gov.uk/HMRC sources.
 *   - 'market-rates'  → `dataBacked: true`; the post is gated on real day-rate
 *     samples (MIN_SAMPLE) and writes off our live benchmark numbers only.
 *   - 'contracting' / 'compliance' → general guidance.
 */

export type BlogCategory =
  | 'ir35-guidance'
  | 'market-rates'
  | 'contracting'
  | 'compliance';

export type BlogTopic = {
  topic: string;
  category: BlogCategory;
  keywords: string[];
  // True for day-rate / market posts that must clear the MIN_SAMPLE gate.
  dataBacked: boolean;
};

// Whether a category requires the IR35 never-assert disclaimer.
export const isIr35GuidanceCategory = (c: BlogCategory): boolean =>
  c === 'ir35-guidance';

export const BLOG_TOPICS: BlogTopic[] = [
  // --- IR35 guidance (disclaimer required, primary sources) ---
  {
    topic: 'What outside IR35 means for limited company contractors',
    category: 'ir35-guidance',
    keywords: ['outside IR35', 'limited company', 'contractor', 'off-payroll'],
    dataBacked: false,
  },
  {
    topic: 'How a Status Determination Statement (SDS) works',
    category: 'ir35-guidance',
    keywords: ['SDS', 'status determination statement', 'IR35', 'end client'],
    dataBacked: false,
  },
  {
    topic: 'CEST tool: what it is and why it is not determinative',
    category: 'ir35-guidance',
    keywords: ['CEST', 'HMRC', 'IR35 status', 'employment status'],
    dataBacked: false,
  },
  {
    topic: 'Mutuality of obligation after the PGMOL ruling',
    category: 'ir35-guidance',
    keywords: ['mutuality of obligation', 'PGMOL', 'IR35', 'employment status'],
    dataBacked: false,
  },
  {
    topic: 'The right of substitution and why it matters for IR35',
    category: 'ir35-guidance',
    keywords: ['substitution', 'IR35', 'personal service', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'Inside vs outside IR35: what changes for your take-home pay',
    category: 'ir35-guidance',
    keywords: ['inside IR35', 'outside IR35', 'take-home pay', 'umbrella'],
    dataBacked: false,
  },
  {
    topic: 'Who is responsible for IR35 status under the off-payroll rules',
    category: 'ir35-guidance',
    keywords: ['off-payroll', 'IR35 responsibility', 'fee-payer', 'end client'],
    dataBacked: false,
  },
  {
    topic: 'Small company exemption from the off-payroll rules',
    category: 'ir35-guidance',
    keywords: [
      'small company exemption',
      'IR35',
      'off-payroll',
      'Companies Act',
    ],
    dataBacked: false,
  },
  {
    topic: 'What a contract review checks for IR35 purposes',
    category: 'ir35-guidance',
    keywords: ['contract review', 'IR35', 'working practices', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'IR35 insurance: what it covers and whether you need it',
    category: 'ir35-guidance',
    keywords: ['IR35 insurance', 'tax investigation', 'contractor', 'cover'],
    dataBacked: false,
  },

  // --- Market rates (data-backed, gated on MIN_SAMPLE) ---
  {
    topic: 'UK contractor day rates by skill: what the market is paying',
    category: 'market-rates',
    keywords: ['contractor day rates', 'UK', 'day rate', 'market rates'],
    dataBacked: true,
  },
  {
    topic: 'How day rates differ between inside and outside IR35 contracts',
    category: 'market-rates',
    keywords: ['day rate', 'inside IR35', 'outside IR35', 'rate difference'],
    dataBacked: true,
  },
  {
    topic: 'Day rate benchmarks for cloud and DevOps contractors',
    category: 'market-rates',
    keywords: ['DevOps day rate', 'cloud contractor', 'AWS', 'day rate'],
    dataBacked: true,
  },

  // --- Contracting (general) ---
  {
    topic: 'Setting your day rate as a new limited company contractor',
    category: 'contracting',
    keywords: ['day rate', 'limited company', 'pricing', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'Limited company vs umbrella: choosing how to contract',
    category: 'contracting',
    keywords: ['limited company', 'umbrella company', 'contractor', 'IR35'],
    dataBacked: false,
  },
  {
    topic: 'How to find your first outside-IR35 contract',
    category: 'contracting',
    keywords: ['first contract', 'outside IR35', 'contractor', 'job search'],
    dataBacked: false,
  },
  {
    topic: 'Building a contractor CV that wins outside-IR35 roles',
    category: 'contracting',
    keywords: ['contractor CV', 'outside IR35', 'job application', 'skills'],
    dataBacked: false,
  },
  {
    topic: 'Negotiating contract extensions and rate rises',
    category: 'contracting',
    keywords: ['contract extension', 'rate rise', 'negotiation', 'contractor'],
    dataBacked: false,
  },

  // --- Compliance (general) ---
  {
    topic: 'VAT registration for limited company contractors',
    category: 'compliance',
    keywords: [
      'VAT registration',
      'limited company',
      'flat rate scheme',
      'contractor',
    ],
    dataBacked: false,
  },
  {
    topic: 'The professional indemnity insurance contractors need',
    category: 'compliance',
    keywords: ['professional indemnity', 'insurance', 'contractor', 'cover'],
    dataBacked: false,
  },
  {
    topic: 'Right to work checks for UK contractors',
    category: 'compliance',
    keywords: ['right to work', 'compliance', 'contractor', 'UK'],
    dataBacked: false,
  },
  {
    topic: 'Keeping good records as a limited company contractor',
    category: 'compliance',
    keywords: ['record keeping', 'limited company', 'accounts', 'HMRC'],
    dataBacked: false,
  },
];
