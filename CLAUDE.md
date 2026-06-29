# Trading Adviser — Project Guide for Claude Code

## What this is
A personal decision-support web app for **crypto and commodities** (Philippine
stocks / PSE are deferred to a later phase). It scores assets and helps with
disciplined trade planning. It is NOT financial advice and never guarantees profit.

## Who I am
Deo — a non-technical founder. Explain technical choices in plain English before
doing them. Work in small steps. Prefer simple, working code over clever code.

## Tech stack (decided)
- All-in-one **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- Database (later): **PostgreSQL** via Prisma, hosted free on Neon or Supabase
- Data via a **provider adapter**: mock/sample now; Binance (crypto) + Twelve Data
  (commodities) later. Charts: TradingView Lightweight Charts (display only).

## Conventions
- Keep the **signal engine** (`src/lib/signal-engine/`) and **risk math**
  (`src/lib/risk/`) separate from the screens, so logic stays testable.
- All non-live data must be clearly labelled **SAMPLE**. Never present sample data as real.
- Use calm, non-promissory language in the UI ("may", "suggests", "wait for
  confirmation") — never "guaranteed", "sure buy", "moonshot".

## Hard rules
- A "Buy Candidate" signal is only allowed with a clear stop-loss, acceptable
  reward-to-risk, AND a computable position size — otherwise downgrade to "Wait".
- No auto-trading, no broker links, no leverage features.
- The risk disclaimer stays visible on every page.

## Start-of-session routine (IMPORTANT)
At the start of EVERY session: read **ROADMAP.md**, then tell Deo (1) what is
already done and (2) the single recommended next step. After finishing any step,
update ROADMAP.md (check off what's done, set the next item) and verify the app
still builds before saying it's done.
