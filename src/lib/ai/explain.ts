import "server-only";

// AI "plain-English take" on an asset's signal, using Claude (Opus 4.8).
// Server-only. Returns null when no API key is set or on any error, so the
// UI degrades gracefully (the rule-based explanation is always shown anyway).
//
// Cost note: change MODEL to "claude-haiku-4-5" for a cheaper/faster take.

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import type { Asset } from "@/types";
import type { ScoreResult } from "@/lib/signal-engine";

const MODEL = "claude-opus-4-8";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You explain trading signals for a crypto and commodities decision-support app aimed at everyday users.
Given one asset's indicators and its 0–100 score, write 2–3 short sentences in plain English on what the signals suggest.
Hard rules:
- Never promise profit. Never use words like "guaranteed", "sure", "will", or "moonshot".
- Use calm, hedged language ("may", "suggests", "could", "tends to").
- Always frame this as decision-support, not financial advice.
- Be concise and neutral. Output ONLY the explanation text — no preamble, no headings, no bullet points.`;

interface ExplainInput {
  name: string;
  symbol: string;
  price: number;
  currency: string;
  score: number;
  signal: string;
  emaDiffPct: number;
  rsi: number;
  macdHistogram: number;
  stopSuggestion: number;
  isSample: boolean;
  styleLabel: string;
}

async function generate(input: ExplainInput): Promise<string | null> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `Asset: ${input.name} (${input.symbol})\n` +
            `Trading style: ${input.styleLabel} (signals are based on this timeframe)\n` +
            `Price: ${input.price} ${input.currency}${input.isSample ? " (SAMPLE data)" : " (live)"}\n` +
            `Score: ${input.score}/100 — verdict: ${input.signal}\n` +
            `Trend: EMA-20 is ${input.emaDiffPct}% vs EMA-50\n` +
            `Momentum: RSI ${input.rsi}\n` +
            `MACD histogram: ${input.macdHistogram}\n` +
            `Suggested stop-loss level: ${input.stopSuggestion}\n\n` +
            `Explain what this suggests for a ${input.styleLabel.toLowerCase()} trader, following the rules.`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : null;
  } catch (err) {
    console.error("aiExplain failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function aiExplainAsset(
  asset: Asset,
  result: ScoreResult,
  styleLabel = "Swing"
): Promise<string | null> {
  if (!aiConfigured()) return null;

  const input: ExplainInput = {
    name: asset.name,
    symbol: asset.symbol,
    price: asset.price,
    currency: asset.currency,
    score: result.score,
    signal: result.signal,
    emaDiffPct: result.indicators.emaDiffPct,
    rsi: result.indicators.rsi,
    macdHistogram: result.indicators.macdHistogram,
    stopSuggestion: result.stopSuggestion,
    isSample: asset.isSample,
    styleLabel,
  };

  // Cache by symbol + style + score + signal so each timeframe gets its own
  // take, and we don't re-call Claude on every view.
  const cached = unstable_cache(
    () => generate(input),
    ["ai-explain", `${asset.symbol}:${styleLabel}:${result.score}:${result.signal}`],
    { revalidate: 3600 }
  );
  return cached();
}
