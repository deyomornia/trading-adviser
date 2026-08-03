# DG Trading Adviser

A decision-support web app for **crypto and commodities**: live market data,
transparent 0–100 signal scores, and disciplined trade planning.

**Live:** https://tradingadviser.dgtechsolutions.online

> ⚠️ **Not financial advice.** This tool describes current market conditions
> using published technical-analysis methods. It never predicts the future,
> never guarantees profit, and never trades for you. Markets involve risk;
> your decisions are your own. The full rules are public at
> [/methodology](https://tradingadviser.dgtechsolutions.online/methodology) —
> nothing is hidden.

## What it does

- **Live data** — 80 coins via Binance's public API, Gold via Twelve Data,
  Oil / Copper / Silver / Natural Gas via Yahoo Finance futures. Anything
  that isn't live is clearly labelled **SAMPLE**, always.
- **Trading styles** — Day (hourly bars), Swing (daily), Position (weekly);
  every score is computed on the timeframe you trade.
- **10 scoring combinations** — from the Classic EMA/RSI/MACD default to
  research-backed setups like MACD+ADX, the 40-week trend filter, and the
  RSI(2) pullback. Pick per style; scores, chart overlays, the screener, and
  the AI explanation all follow your choice.
- **Universal safety rules no combination can bypass** — a "Buy Candidate"
  requires a score ≥ 65, every buy condition passing, **and** a valid
  stop-loss level. Long-only. Never scored on missing or volume-less data —
  you see an honest "not available" with the reason instead.
- **Top Opportunities screener** — ranks every live asset for your style and
  combination, and reports what it skipped and why.
- **Trade planning** — risk calculator, rule-based suggested setups
  (1×ATR / swing-low stops, 1R/2R/3R targets, 2:1 reward-to-risk by
  construction), per-user trade journal and portfolio view.
- **AI "take"** — a calm, hedged plain-English read of each asset's signals
  (Claude), clearly labelled AI-generated.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (auth + Postgres
with row-level security) · PayMongo (payments) · TradingView Lightweight
Charts (rendering only) · Claude API · Vitest. Deployed on Vercel (Singapore).

## Architecture in one minute

```
src/lib/signal-engine/
  profiles.ts      ← THE registry: all 10 scoring combinations (single source
                     of truth — points, gates, overlays, doc strings)
  engine.ts        ← universal rules: availability guard, stop-loss gate,
                     65/40 verdict bands, long-only
  scorer.ts        ← the Classic combination (guarded byte-identical by tests)
  indicators.ts    ← pure math: EMA, RSI, MACD, ATR, SMA, ADX, VWAP,
                     Bollinger, ROC
src/lib/data-providers/   ← Binance / Twelve Data / Yahoo adapters with
                            per-asset SAMPLE fallback
src/lib/risk/             ← position-sizing math
src/app/                  ← screens (they read the registry, never hardcode it)
```

The `/methodology` page and every score breakdown are **generated from the
registry**, so the published rules cannot drift from the code that runs.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own keys (see comments inside)
npm run dev                  # http://localhost:3000
```

Without any keys the app runs on clearly-labelled SAMPLE data. Supabase
(free tier) enables accounts; a Twelve Data key enables live Gold; crypto
needs no key at all.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (must pass before any merge) |
| `npm test` | Unit tests — including the Classic-identity guard that fails if any refactor changes existing scores |
| `LIVE_CHECK=1 npm test` | Extra tests against real provider APIs (data depth, volume guard, same-candles identity) |

## Security

See [SECURITY.md](SECURITY.md) for the reporting policy. Highlights: strict
Supabase row-level security on all user data, database-level locks on
billing columns (a client cannot grant itself Pro), webhook signature
verification, no secrets in this repository (verified against full git
history), and security headers on every response.

## License

Copyright © 2026 DG Tech Solutions. All rights reserved. The source is
public for transparency — the scoring rules users trust are the ones you can
read here — but this is not open-source software; no license is granted to
reuse, copy, or operate this code as a service.
