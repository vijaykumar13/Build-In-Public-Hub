import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
});

// Check if payments are enabled
export const PAYMENTS_ENABLED = process.env.SPAR_PAYMENTS_ENABLED === 'true';

// Spar entry fee in cents ($9.99)
export const SPAR_ENTRY_FEE_CENTS = 999;

// Platform fee percentage (20%)
export const PLATFORM_FEE_PERCENT = 20;
