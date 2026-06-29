# Trading Adviser

A decision-support web app for crypto and commodities. **Not financial advice.**
This is the Phase 1 skeleton: navigation, shared layout, the permanent risk
disclaimer, and 6 placeholder pages. Sample data and live features come next.

## How to run it (3 steps)

1. **Open this folder in VS Code:** File → Open Folder → choose the
   `trading-adviser` folder.
2. **Open the terminal** (Terminal → New Terminal) and install the tools the
   app needs — this creates the `node_modules` folder automatically:

       npm install

3. **Start the app:**

       npm run dev

   Then open your browser to **http://localhost:3000**.
   To stop it, click the terminal and press `Ctrl + C`.

## The 6 pages

| Page        | What goes here (future phase)                          |
|-------------|--------------------------------------------------------|
| Dashboard   | Screener + your watchlist (Phase 3)                    |
| Asset Detail| Chart, indicators, signal score (Phase 4)             |
| Trade Plan  | Risk calculator (Phase 6)                              |
| Journal     | Trade journal (Phase 7)                                |
| Portfolio   | Exposure & risk warnings (Phase 8)                     |
| Settings    | App rules & preferences (later)                        |

## Where to edit things

- Pages you see:        `src/app/<page>/page.tsx`
- The top menu:         `src/components/Nav.tsx`
- The shared frame:     `src/app/layout.tsx`
