import 'server-only';

import {
  isValidVatNumberShape,
  normalizeVatNumber,
  type VatResult,
} from './parse';

const HMRC_BASE = 'https://api.service.hmrc.gov.uk';

// Cache the application access token in-module until shortly before it expires.
let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (
  clientId: string,
  clientSecret: string,
): Promise<string | null> => {
  // 30s safety margin so we never use a token mid-expiry.
  if (cachedToken && cachedToken.expiresAt - 30_000 > nowMs()) {
    return cachedToken.value;
  }

  let res: Response;
  try {
    res = await fetch(`${HMRC_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'read:vat',
      }),
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (res.status !== 200) return null;
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) return null;

  cachedToken = {
    value: body.access_token,
    expiresAt: nowMs() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
};

// Wrapped so the schema-engine date guard (no argless Date in some contexts)
// stays out of the pure layer; here we're in normal runtime, Date.now is fine.
const nowMs = (): number => Date.now();

/**
 * Verify a UK VAT registration number via HMRC's "Check a UK VAT number" API.
 *
 * INERT until HMRC credentials exist: HMRC's v2.0 API is application-restricted
 * and the Developer Hub app takes ~2 weeks to approve. Without HMRC_CLIENT_ID /
 * HMRC_CLIENT_SECRET this returns { status: 'pending' } — so the rest of the
 * verify flow ships now and VAT lights up automatically once the creds land.
 *
 * Never throws. 200 (target details) → verified; 404/NOT_FOUND → not_found.
 */
export const verifyVat = async (rawVrn: string): Promise<VatResult> => {
  const clientId = process.env.HMRC_CLIENT_ID;
  const clientSecret = process.env.HMRC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { status: 'pending' };

  if (!isValidVatNumberShape(rawVrn)) return { status: 'not_found' };
  const vrn = normalizeVatNumber(rawVrn);

  const token = await getAccessToken(clientId, clientSecret);
  if (!token) return { status: 'error' };

  let res: Response;
  try {
    res = await fetch(
      `${HMRC_BASE}/organisations/vat/check-vat-number/lookup/${vrn}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.hmrc.2.0+json',
        },
        cache: 'no-store',
      },
    );
  } catch {
    return { status: 'error' };
  }

  if (res.status === 200) {
    const body = (await res.json()) as { target?: { name?: string } };
    return { status: 'verified', name: body.target?.name };
  }
  if (res.status === 404) return { status: 'not_found' };
  return { status: 'error' };
};
