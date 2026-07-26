-- ============================================================================
-- Trading Adviser — admin role (owner account)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
--
-- Adds a `role` column ('user' | 'admin') that normal users CANNOT write —
-- same protection pattern as the billing columns (billing-lock.sql). Only the
-- service role (server-side) may change it, and the app's /admin page checks
-- it on every request and every action.
--
-- ⚠️ BEFORE RUNNING: replace YOUR-LOGIN-EMAIL at the bottom with the email
-- you use to log in to the app.
-- ============================================================================

-- 1. The role column. Everyone starts as a normal user.
alter table public.profiles
  add column if not exists role text not null default 'user';

-- 2. Users must not be able to change their own role from the browser.
revoke update (role) on public.profiles from anon, authenticated;

-- 3. Extend the protected-columns trigger to also cover `role`
--    (replaces the version from billing-lock.sql; same trigger stays attached).
create or replace function public.block_billing_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.tier is distinct from old.tier
      or new.paid_until is distinct from old.paid_until
      or new.role is distinct from old.role)
     and current_setting('role', true) <> 'service_role'
     and current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
  then
    -- Silently keep the protected values instead of erroring the whole update.
    new.tier := old.tier;
    new.paid_until := old.paid_until;
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_billing_self_update on public.profiles;
create trigger profiles_block_billing_self_update
  before update on public.profiles
  for each row execute function public.block_billing_self_update();

-- 4. Promote the owner account. ⚠️ REPLACE THE EMAIL BELOW with your login email.
update public.profiles set role = 'admin' where email = 'YOUR-LOGIN-EMAIL';

-- Check it worked (should return exactly your account):
select email, role from public.profiles where role = 'admin';
