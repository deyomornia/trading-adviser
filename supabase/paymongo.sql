-- ============================================================================
-- Trading Adviser — PayMongo paywall setup (Phase B)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
-- ============================================================================

-- Time-based access: a user is "Pro" while paid_until is in the future.
-- Covers the 7-day trial and paid 30-day periods.
alter table public.profiles
  add column if not exists paid_until timestamptz;

-- Remembers the in-progress PayMongo checkout so the success page can verify it.
alter table public.profiles
  add column if not exists pending_checkout_id text;

-- New signups get a 7-day free trial automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, paid_until)
  values (new.id, new.email, now() + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;
