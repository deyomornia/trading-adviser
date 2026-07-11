-- ============================================================================
-- Trading Adviser — Trade Journal setup (Phase 7)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- ============================================================================

-- One row per logged trade. Each row belongs to exactly one user.
create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  symbol        text not null,
  direction     text not null default 'long',   -- 'long' | 'short'
  entry         numeric not null,
  stop_loss     numeric,
  target        numeric,
  position_size numeric,
  status        text not null default 'open',    -- 'open' | 'closed'
  exit          numeric,                          -- filled when closed
  result        numeric,                          -- profit/loss when closed
  notes         text,
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz
);

-- Row-Level Security: each user only ever sees/changes their OWN trades.
alter table public.trades enable row level security;

drop policy if exists "Users read own trades" on public.trades;
create policy "Users read own trades"
  on public.trades for select using (auth.uid() = user_id);

drop policy if exists "Users insert own trades" on public.trades;
create policy "Users insert own trades"
  on public.trades for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own trades" on public.trades;
create policy "Users update own trades"
  on public.trades for update using (auth.uid() = user_id);

drop policy if exists "Users delete own trades" on public.trades;
create policy "Users delete own trades"
  on public.trades for delete using (auth.uid() = user_id);
