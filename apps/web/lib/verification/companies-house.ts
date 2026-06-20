import 'server-only';

import {
  type CompaniesHouseResult,
  isValidCompanyNumberShape,
  mapCompaniesHouseHttp,
  mapCompanyProfile,
  normalizeCompanyNumber,
} from './parse';

const CH_BASE = 'https://api.company-information.service.gov.uk';

/**
 * Verify a UK limited company against the Companies House Public Data API.
 * Returns a status the caller maps to companyVerifiedAt (only on 'verified').
 * Never throws — config/transient failures resolve to { status: 'error' } so a
 * verification hiccup can't break the add-company flow.
 *
 * Auth: HTTP Basic, API key as username + empty password (the trailing ':' is
 * essential). Key stays server-side (this module is server-only).
 */
export const verifyCompany = async (
  rawNumber: string,
): Promise<CompaniesHouseResult> => {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return { status: 'error' }; // unconfigured — caller treats as not verified

  if (!isValidCompanyNumberShape(rawNumber)) {
    return { status: 'not_found' };
  }

  const number = normalizeCompanyNumber(rawNumber);
  const auth = Buffer.from(`${key}:`).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${CH_BASE}/company/${number}`, {
      headers: { Authorization: `Basic ${auth}` },
      // Verification is a point-in-time check; don't let Next cache it.
      cache: 'no-store',
    });
  } catch {
    return { status: 'error' };
  }

  if (res.status === 200) {
    const profile = (await res.json()) as Parameters<
      typeof mapCompanyProfile
    >[0];
    return mapCompanyProfile(profile);
  }

  return mapCompaniesHouseHttp(res.status);
};
