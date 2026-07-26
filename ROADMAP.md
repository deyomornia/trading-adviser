# Trading Adviser — Roadmap & Status
_Last updated: Phase B complete (2026-07-18). Claude Code: update this file as steps complete._

## ✅ Done
- [x] Phase 1 — Next.js project, navigation, 6 pages, permanent disclaimer
- [x] Phase 2 — Sample crypto + commodity data (clearly labelled SAMPLE)
- [x] Phase 3 (core) — Dashboard shows read-only asset tables
- [x] Phase 6 — Risk Calculator on the Trade Plan page (math verified)
- [x] Phase 5 — Signal Engine (EMA-20/50, RSI-14, MACD → 0–100 score + Buy Candidate / Wait / Avoid)
- [x] Phase A — Auth + database foundation (Supabase): sign-up/login/logout, protected
      pages, `profiles` table with `tier` field, `canAccess()` helper. Login verified working.
- [x] Phase 4 — Asset Detail page (candlestick chart, score breakdown, plain-English explanation)
- [x] Phase 7 — Trade Journal (per-user, saved to Supabase `trades` table; verified end-to-end)
- [x] Phase 8 — Portfolio view (per-user exposure by class + concentration warnings; logic verified)
- [x] Phase 9 (mostly) — LIVE data: BTC/ETH/SOL via Binance (no key) + Gold via Twelve Data.
      Oil + Copper stay SAMPLE (need a paid Twelve Data plan). Provider layer + LIVE/SAMPLE labels done.
- [x] Phase B — Paywall via PayMongo (GCash/GrabPay/Maya/card). 7-day trial + ₱499/30-day
      access (paid_until model). FREE: Dashboard/Asset Detail/Trade Plan; PAID: Journal/Portfolio.
      Tested end-to-end with test GCash payment.
- [x] Deployed LIVE to Vercel → https://trading-adviser.vercel.app (auto-deploys on git push to main).
      Env vars set in Vercel; Supabase URL config points to the live domain. Google login removed
      (email/password only). PayMongo still in TEST mode.
- [x] Customizable watchlist — 24 live coins (Binance) + Gold; /watchlist page to search/pick
      which assets show on the dashboard (per-user, `watchlist` table).
- [x] Phase 10 — AI "take" on the Asset Detail page (Claude Opus 4.8, cached, streamed via
      Suspense; enabled — ANTHROPIC_API_KEY set in Vercel). Verified working.
- [x] Trading style selector — Day (hourly) / Swing (daily) / Position (weekly). Changes the
      candle timeframe the signals are scored on; choice stored in a cookie. Crypto has all
      timeframes (Binance, free); commodities use daily where intraday isn't on the free plan.
- [x] App review fixes (2026-07-26) — timeframe-aware signal thresholds + proper EMA warm-up;
      paywall bypass closed (billing-lock.sql run + SUPABASE_SERVICE_ROLE_KEY in Vercel);
      honest watchlist badges; delete confirmation; mobile tables; Trade Plan "Save to journal"
      + prefill; real Settings page (defaults + account).
- [x] Top Opportunities screener — scans all live assets (catalog grown to 45 coins + Gold,
      MATIC→POL fixed) and ranks the top 15 per trading style on the dashboard. Teaser gating:
      free sees top 3, Pro unlocks all 15 ("screener-full" in access.ts). Live-data-only (never
      ranks SAMPLE assets).
- [x] Admin panel — /admin (owner-only via locked profiles.role + isAdmin() + service-role
      reads/writes): all users with joined/last-sign-in/plan, +7d/+30d Pro grants, Revoke,
      suspend/unsuspend, type-to-confirm delete, stats + search. admin-role.sql run.
- [x] Rebrand to "DG Trading Adviser" (title, nav, Pro pages, PayMongo checkout line item).
- [x] "Midnight desk" redesign — dark/light toggle (dark default, cookie-persisted), ink/accent
      tokens, theme-aware chart, mono numerals, sparklines on all rows, ScoreRing gauge,
      DG candlestick logo + app icon.

## ▶️ Recommended next
- [ ] Binance auto-sync (agreed next feature) — let Deo connect Binance with a READ-ONLY API key
      so his real SPOT trades import into the journal automatically (periodic/on-open sync, not a
      live push), for later performance insights. SECURITY: read-only key only (no trade/withdraw),
      stored encrypted server-side; spot only (matches the no-leverage rule). Verify the authed
      Binance account API works from PH + Vercel; trades are queried per trading pair. CSV import
      was the safer alt but Deo chose auto-sync.
- [ ] Keep dogfooding; then go-live: PayMongo LIVE keys + webhook; Supabase email confirmation ON.

## ⬜ Later
- [ ] Go-live payments: PayMongo LIVE keys + webhook on the deployed URL (needs PayMongo
      business approval); switch Supabase email confirmation back ON.
- [ ] Phase 10 — AI plain-English explanations (needs Claude API key)
- [ ] (Optional) upgrade Twelve Data plan to make Oil + Copper live

## Notes
- v1 scope = crypto + commodities only. PSE stocks deferred (no clean free API).
- Database is Supabase (settled — replaced the old "Neon or Supabase" choice).
- Email confirmation is currently ON in Supabase (new signups must click a link in
  their inbox). Fine for launch; can be toggled off in Auth → Providers → Email for
  faster local testing.
