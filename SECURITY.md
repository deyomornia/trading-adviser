# Security Policy

## Reporting a vulnerability

If you find a security issue in DG Trading Adviser, please report it
privately — do not open a public GitHub issue.

- Email: **deodexter95@gmail.com** with the subject line `SECURITY:`
- Or use the in-app **Support** page (creates a private ticket to the admin)

Please include steps to reproduce and what data or actions the issue
exposes. You'll get an acknowledgement within a few days. Please give us a
reasonable window to fix the issue before any public disclosure.

## Scope

The deployed app at `tradingadviser.dgtechsolutions.online` and the code in
this repository. Especially valuable reports:

- Access-control bypasses (reading another user's journal/portfolio/tickets,
  reaching admin functions, Pro-feature bypasses that touch the database)
- Payment-flow issues (granting paid access without a verified payment)
- Injection or XSS anywhere user input is rendered

## What we already do

- **Row-level security** on every user table (journal, portfolio, watchlist,
  tickets) — enforced in Postgres, not just the UI.
- **Database-level billing locks** — the `tier`, `paid_until`, and `role`
  columns are protected by REVOKE + a security-definer trigger, so a client
  session can never grant itself paid access; grants happen only server-side
  after PayMongo webhook signature verification (timing-safe HMAC).
- **No secrets in the repository** — environment keys live only in local
  `.env.local` files and Vercel; the full git history has been scanned.
- **Middleware-gated routes** with server-side session validation.
- **No auto-trading, no broker connections, no leverage** — the app cannot
  move user funds by design.

## Out of scope

- Denial of service / volumetric attacks
- Issues in third-party services themselves (Supabase, Vercel, PayMongo,
  Binance, Twelve Data, Yahoo)
- The SAMPLE data mode showing placeholder numbers (it is labelled as such)
