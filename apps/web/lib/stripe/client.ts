import 'server-only';
import Stripe from 'stripe';

/**
 * Lazily-constructed Stripe client. Test keys in dev, live keys in prod — purely
 * env-driven (STRIPE_SECRET_KEY), so the same code runs in both modes. Lazy so a
 * missing key never crashes module import (e.g. at build time); it only throws
 * when payment code actually runs.
 */
let stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  // Pin the SDK's default API version (don't override) — the installed
  // stripe@15 SDK ships the matching types, so omitting apiVersion uses the
  // version the SDK was built against, avoiding type drift.
  stripe = new Stripe(key);
  return stripe;
};

// The £219 native-job-posting price. A Stripe Price id (price_…) — test price in
// dev, live price in prod. Set per-environment so we never hardcode an id.
export const getJobPostPriceId = (): string => {
  const priceId = process.env.STRIPE_JOB_POST_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_JOB_POST_PRICE_ID is not set');
  }
  return priceId;
};

// Absolute site origin for Stripe Checkout success/cancel redirect URLs. Stripe
// needs fully-qualified URLs. NEXTAUTH_URL is set in every environment (Auth.js
// already relies on it); fall back to localhost for a bare dev run.
export const getSiteUrl = (): string =>
  (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
