-- ============================================================================
-- Trading Adviser — Database setup (Phase A)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once (uses "if not exists" / "create or replace").
-- ============================================================================

-- 1. The profiles table: one row per user account.
--    `tier` is the hook for selling access later (free vs paid).
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  tier       text not null default 'free',
  created_at timestamptz not null default now()
);

-- 2. Row-Level Security: each user can see/edit ONLY their own profile.
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
