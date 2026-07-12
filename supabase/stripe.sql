-- ============================================================================
-- Trading Adviser — Stripe/paywall setup (Phase B)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
-- ============================================================================

-- Store the Stripe customer id on each profile so the webhook can map a Stripe
-- subscription back to the right user (and so we can open the billing portal).
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- `tier` already exists from Phase A (default 'free'); Stripe flips it to 'paid'
-- while a subscription/trial is active, and back to 'free' when it ends.
