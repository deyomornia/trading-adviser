-- ============================================================================
-- Trading Adviser — lock billing columns (SECURITY, before live payments)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
--
-- Problem it fixes: the profiles UPDATE policy lets a logged-in user edit their
-- OWN row, which includes tier / paid_until — so a user could set themselves to
-- "paid" for free from the browser. This revokes the ability for normal users
-- to write those columns; only the service-role (used by the PayMongo webhook
-- and the verified success-page sync) can grant access.
-- ============================================================================

-- Take away column-level UPDATE on the billing fields from normal user roles.
revoke update (tier, paid_until) on public.profiles from anon, authenticated;

-- (Users may still update other columns of their own row, e.g. pending_checkout_id,
--  which the checkout flow needs. The service_role bypasses this and RLS.)

-- Belt-and-suspenders: reject any tier/paid_until change coming from the
-- browser-side roles (anon/authenticated), even if a future GRANT re-opens the
-- column. The dashboard SQL editor (postgres) and the server key (service_role)
-- pass through. NOTE: superseded by admin-role.sql, which extends this same
-- function to also protect `role` — run that after this.
create or replace function public.block_billing_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.tier is distinct from old.tier
      or new.paid_until is distinct from old.paid_until)
     and coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated')
  then
    -- Silently keep the old billing values instead of erroring the whole update.
    new.tier := old.tier;
    new.paid_until := old.paid_until;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_billing_self_update on public.profiles;
create trigger profiles_block_billing_self_update
  before update on public.profiles
  for each row execute function public.block_billing_self_update();
