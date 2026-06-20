/**
 * Pure mapping/normalization for company verification. No fetch/Prisma here so it
 * can be unit-tested — this logic gates the IDENTITY_VERIFIED trust tier, so a
 * silent bug (treating a dissolved company as active, a bad number as valid) has
 * real consequences. See parse.test.ts.
 */

// The outcome of one verification check (Companies House or VAT).
export type VerificationStatus =
  | 'verified' // the register confirms it (CH: active; VAT: registered)
  | 'not_found' // the register has no such company / VRN
  | 'inactive' // exists but not active (CH: dissolved/liquidation/etc.)
  | 'pending' // check not run — credentials not configured (e.g. HMRC not yet approved)
  | 'error'; // transient/config failure (bad key, network, rate limit)

export type CompaniesHouseResult = {
  status: VerificationStatus;
  name?: string;
  address?: string;
  companyStatus?: string;
};

export type VatResult = {
  status: VerificationStatus;
  name?: string;
};

/**
 * Normalize a UK company registration number to the Companies House 8-char form:
 * uppercase, strip spaces. Numeric-only numbers are zero-padded to 8 (e.g.
 * "6" → "00000006"); prefixed numbers (SC…, NI…, OC…) are left as-is after
 * padding their digits is NOT safe, so only pad pure-digit inputs.
 */
export const normalizeCompanyNumber = (raw: string): string => {
  const cleaned = raw.toUpperCase().replace(/\s+/g, '');
  if (/^\d+$/.test(cleaned)) return cleaned.padStart(8, '0');
  return cleaned;
};

// Basic shape check before we spend an API call. CH numbers are 8 chars:
// 8 digits, or a 2-letter prefix + 6 digits (SC######, NI######, OC######…).
export const isValidCompanyNumberShape = (raw: string): boolean =>
  /^(?:\d{8}|[A-Z]{2}\d{6})$/.test(normalizeCompanyNumber(raw));

/**
 * Map a Companies House company-profile JSON (HTTP 200) to a result. `active`
 * status → verified; any other present status → inactive (exists but not live).
 */
export const mapCompanyProfile = (profile: {
  company_name?: string;
  company_status?: string;
  registered_office_address?: Record<string, string | undefined>;
}): CompaniesHouseResult => {
  const companyStatus = profile.company_status;
  const address = formatRegisteredOffice(profile.registered_office_address);
  return {
    status: companyStatus === 'active' ? 'verified' : 'inactive',
    name: profile.company_name,
    companyStatus,
    address,
  };
};

// Map a Companies House HTTP status to a result when the body isn't a profile.
export const mapCompaniesHouseHttp = (
  httpStatus: number,
): CompaniesHouseResult => {
  if (httpStatus === 404) return { status: 'not_found' };
  // 401 = bad/missing key (config), 429 = rate limit, 5xx = upstream — all 'error'.
  return { status: 'error' };
};

const formatRegisteredOffice = (
  addr?: Record<string, string | undefined>,
): string | undefined => {
  if (!addr) return undefined;
  const parts = [
    addr.premises,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ].filter((p): p is string => !!p && p.trim().length > 0);
  return parts.length ? parts.join(', ') : undefined;
};

// Normalize a VAT number: uppercase, strip spaces and a leading "GB" prefix
// (HMRC's lookup expects the 9- or 12-digit VRN without the country code).
export const normalizeVatNumber = (raw: string): string =>
  raw.toUpperCase().replace(/\s+/g, '').replace(/^GB/, '');

// A GB VRN is 9 or 12 digits (after stripping GB).
export const isValidVatNumberShape = (raw: string): boolean =>
  /^\d{9}(?:\d{3})?$/.test(normalizeVatNumber(raw));
