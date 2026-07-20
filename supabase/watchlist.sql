-- ============================================================================
-- Trading Adviser — Watchlist setup (dashboard customization)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
-- ============================================================================

-- Which assets each user wants shown on their dashboard.
create table if not exists public.watchlist (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  symbol   text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table public.watchlist enable row level security;

drop policy if exists "Users read own watchlist" on public.watchlist;
create policy "Users read own watchlist"
  on public.watchlist for select using (auth.uid() = user_id);

drop policy if exists "Users insert own watchlist" on public.watchlist;
create policy "Users insert own watchlist"
  on public.watchlist for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete own watchlist" on public.watchlist;
create policy "Users delete own watchlist"
  on public.watchlist for delete using (auth.uid() = user_id);
