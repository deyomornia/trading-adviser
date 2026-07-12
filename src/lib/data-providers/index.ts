// Single place the app imports its data source from. Swap the export here to
// change the whole app's data source — nothing else needs to change.
//
// Default is the LIVE provider: real crypto via Binance (no key needed) and
// real commodities via Twelve Data when a key is present; each falls back to
// clearly-labelled SAMPLE data if a fetch fails.
//
// To force sample-only (e.g. offline dev), set DATA_SOURCE=mock.

import type { DataProvider } from "./provider";
import { liveProvider } from "./live";
import { mockProvider } from "./mock";

export const dataProvider: DataProvider =
  process.env.DATA_SOURCE === "mock" ? mockProvider : liveProvider;
