// Async server component: fetches the AI "take" and renders it. Returns null
// when AI isn't configured or unavailable, so the section simply disappears.
// Wrap in <Suspense> so it streams in without blocking the rest of the page.

import { aiExplainAsset } from "@/lib/ai/explain";
import type { Asset } from "@/types";
import type { ScoreResult } from "@/lib/signal-engine";

export default async function AiSummary({
  asset,
  result,
  styleLabel,
}: {
  asset: Asset;
  result: ScoreResult;
  styleLabel?: string;
}) {
  const text = await aiExplainAsset(asset, result, styleLabel);
  if (!text) return null;

  return (
    <section className="mt-6 rounded-lg border border-indigo-200 dark:border-accent/25 bg-indigo-50 dark:bg-accent/10 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-accent">
        AI take
        <span className="rounded bg-indigo-100 dark:bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-accent">
          AI-generated
        </span>
      </h2>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-ink-100/90">{text}</p>
      <p className="mt-2 text-xs text-indigo-400 dark:text-ink-300/70">
        Written by AI from the indicators above. Decision-support only — not financial advice.
      </p>
    </section>
  );
}
