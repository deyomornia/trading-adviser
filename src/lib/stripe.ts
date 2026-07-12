// Server-side Stripe client + config helpers.
// All Stripe keys are secret and server-only (never NEXT_PUBLIC).

import Stripe from "stripe";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  }
  return client;
}

export const PRICE_ID = () => process.env.STRIPE_PRICE_ID ?? "";
export const TRIAL_DAYS = 7;

// Where Stripe sends the user back after checkout / billing portal.
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
