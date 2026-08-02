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
- **Scoring profiles live ONLY in the registry**
  (`src/lib/signal-engine/profiles.ts`). Never hardcode a profile's components,
  points, tiers, gates, labels, or overlays in UI, providers, the methodology
  page, or AI prompts — always read from the registry. Each profile carries its
  compute functions AND its display tier strings side by side; keep them
  mirrored when editing. Adding a profile = one registry entry + tests
  (`src/lib/signal-engine/__tests__/profiles.test.ts`); the methodology page
  updates itself.
- **Universal rules live in `src/lib/signal-engine/engine.ts`** and no profile
  may bypass them: availability guard first (never score missing/thin/
  volume-less data), the 20-candle stop-loss gate, the 65/40 verdict bands
  (exported as `BUY_SCORE_MIN` / `AVOID_SCORE_BELOW` — user-facing docs must
  read these constants, not copy the numbers), long-only.
- **Classic identity is guarded**: `scorer.ts` IS the Classic profile and must
  stay byte-identical in behavior; `classic-identity.test.ts` enforces it.
  Never widen Classic's candle fetch depths (168/120/120) — deeper history
  changes SMA-seeded EMAs and silently shifts every score. Profiles needing
  more history set their own `fetch` override instead.
- **Keep published parameters in sync:** whenever signal-engine or trade-setup
  parameters change (`src/lib/signal-engine/scorer.ts`, `profiles.ts`,
  `src/lib/trade-setup.ts`, data-refresh cadences), update every user-facing
  text that states those numbers **in the same change**. The methodology page
  and score breakdowns now generate from the registry, so registry edits are
  covered automatically — but the TradeSetupCard notes and the freshness notes
  in banners/tooltips are still hand-written. The app promises "nothing is
  hidden"; stale docs break that.

## Hard rules
- A "Buy Candidate" signal is only allowed with a clear stop-loss, acceptable
  reward-to-risk, AND a computable position size — otherwise downgrade to "Wait".
- No auto-trading, no broker links, no leverage features.
- The risk disclaimer stays visible on every page.

## Start-of-session routine (IMPORTANT)
At the start of EVERY session: read **ROADMAP.md**, then tell Deo (1) what is
already done and (2) the single recommended next step. After finishing any step,
update ROADMAP.md (check off what's done, set the next item) and verify the app
still builds AND `npm test` passes before saying it's done.
