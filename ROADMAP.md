# Trading Adviser — Roadmap & Status
_Last updated: Phase A complete (2026-07-05). Claude Code: update this file as steps complete._

## ✅ Done
- [x] Phase 1 — Next.js project, navigation, 6 pages, permanent disclaimer
- [x] Phase 2 — Sample crypto + commodity data (clearly labelled SAMPLE)
- [x] Phase 3 (core) — Dashboard shows read-only asset tables
- [x] Phase 9 (partial) — Data-provider adapter + mock provider
- [x] Phase 6 — Risk Calculator on the Trade Plan page (math verified)
- [x] Phase 5 — Signal Engine (EMA-20/50, RSI-14, MACD → 0–100 score + Buy Candidate / Wait / Avoid)
- [x] Phase A — Auth + database foundation (Supabase): sign-up/login/logout, protected
      pages, `profiles` table with `tier` field, `canAccess()` helper. Login verified working.

## ▶️ Recommended next
- [ ] Phase 4 — Asset Detail page (candlestick chart, indicators, signal explanation)
      Now makes sense: there are real scores to explain, and logged-in users to show them to.

## ⬜ Later
- [ ] Phase 7 — Trade Journal (per-user, saved to Supabase)
- [ ] Phase 8 — Portfolio view (per-user exposure + concentration warnings)
- [ ] Phase B — Paywall layer (tighten `canAccess()` + add Stripe) when ready to sell access
- [ ] Phase 9 (finish) — Wire real Binance (crypto) + Twelve Data (commodities)
- [ ] Phase 10 — AI explanation layer (explains the signal in plain English)

## Notes
- v1 scope = crypto + commodities only. PSE stocks deferred (no clean free API).
- Database is Supabase (settled — replaced the old "Neon or Supabase" choice).
- Email confirmation is currently ON in Supabase (new signups must click a link in
  their inbox). Fine for launch; can be toggled off in Auth → Providers → Email for
  faster local testing.
