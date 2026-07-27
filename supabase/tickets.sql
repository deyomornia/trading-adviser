-- ============================================================================
-- DG Trading Adviser — support tickets (beta feedback)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run repeatedly.
--
-- Users open tickets and message the admin; the admin replies through the
-- app's service-role path. RLS keeps every user strictly inside their own
-- tickets, and users can never set the from_admin flag or post to a closed
-- ticket.
-- ============================================================================

create table if not exists public.tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  subject    text not null,
  status     text not null default 'open', -- 'open' | 'closed'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets on delete cascade,
  sender_id  uuid not null default auth.uid() references auth.users on delete cascade,
  from_admin boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- Tickets: each user sees and creates only their own. No user update/delete.
drop policy if exists "Users read own tickets" on public.tickets;
create policy "Users read own tickets"
  on public.tickets for select using (auth.uid() = user_id);

drop policy if exists "Users create own tickets" on public.tickets;
create policy "Users create own tickets"
  on public.tickets for insert with check (auth.uid() = user_id);

-- Messages: readable only inside your own tickets; users can only write as
-- themselves (never as admin) and only while the ticket is open.
drop policy if exists "Users read own ticket messages" on public.ticket_messages;
create policy "Users read own ticket messages"
  on public.ticket_messages for select
  using (exists (
    select 1 from public.tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  ));

drop policy if exists "Users write own ticket messages" on public.ticket_messages;
create policy "Users write own ticket messages"
  on public.ticket_messages for insert
  with check (
    sender_id = auth.uid()
    and from_admin = false
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.user_id = auth.uid() and t.status = 'open'
    )
  );

-- Keep tickets.updated_at fresh on every new message (any sender).
create or replace function public.touch_ticket_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists ticket_messages_touch_ticket on public.ticket_messages;
create trigger ticket_messages_touch_ticket
  after insert on public.ticket_messages
  for each row execute function public.touch_ticket_updated_at();
