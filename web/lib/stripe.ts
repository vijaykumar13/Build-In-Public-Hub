import Stripe from 'stripe';

// Check if payments are enabled
export const PAYMENTS_ENABLED = process.env.SPAR_PAYMENTS_ENABLED === 'true';

// Lazy-initialize Stripe only when payments are enabled and key exists
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Keep backward compat - but only use in guarded code paths
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Spar entry fee in cents ($9.99)
export const SPAR_ENTRY_FEE_CENTS = 999;

// Platform fee percentage (20%)
export const PLATFORM_FEE_PERCENT = 20;
