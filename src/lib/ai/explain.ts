import "server-only";

// AI "plain-English take" on an asset's signal, using Claude (Opus 4.8).
// Server-only. Returns null when no API key is set or on any error, so the
// UI degrades gracefully (the rule-based explanation is always shown anyway).
//
// Profile-aware: the prompt lists the active scoring profile's components and
// gates, so the AI explains in the right vocabulary for any combination.
//
// Cost note: change MODEL to "claude-haiku-4-5" for a cheaper/faster take.

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import type { Asset } from "@/types";
import type { ProfileScoreResult } from "@/lib/signal-engine";

const MODEL = "claude-opus-4-8";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You explain trading signals for a crypto and commodities decision-support app aimed at everyday users.
Given one asset's indicator readings and its 0–100 score, write 2–3 short sentences in plain English on what the signals suggest.
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
  profileName: string;
  logicNote?: string;
  components: { name: string; points: number; maxPoints: number; hint: string }[];
  gates: { label: string; passed: boolean }[];
  stopSuggestion: number;
  isSample: boolean;
  styleLabel: string;
}

async function generate(input: ExplainInput): Promise<string | null> {
  try {
    const client = new Anthropic();
    const componentLines = input.components
      .map((c) => `- ${c.name}: ${c.points}/${c.maxPoints} (${c.hint})`)
      .join("\n");
    const gateLines = input.gates
      .map((g) => `- ${g.label}: ${g.passed ? "passed" : "NOT met"}`)
      .join("\n");

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
            `Scoring combination: ${input.profileName}\n` +
            (input.logicNote
              ? `IMPORTANT for this combination: ${input.logicNote}\n`
              : "") +
            `Price: ${input.price} ${input.currency}${input.isSample ? " (SAMPLE data)" : " (live)"}\n` +
            `Score: ${input.score}/100 — verdict: ${input.signal}\n` +
            `Score components:\n${componentLines}\n` +
            `Buy conditions:\n${gateLines}\n` +
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
  result: ProfileScoreResult,
  styleLabel = "Swing",
  logicNote?: string
): Promise<string | null> {
  if (!aiConfigured()) return null;

  const input: ExplainInput = {
    name: asset.name,
    symbol: asset.symbol,
    price: asset.price,
    currency: asset.currency,
    score: result.score,
    signal: result.signal,
    profileName: result.profileName,
    logicNote,
    components: result.components.map((c) => ({
      name: c.name,
      points: c.points,
      maxPoints: c.maxPoints,
      hint: c.hint,
    })),
    gates: result.buyGates.map((g) => ({ label: g.label, passed: g.passed })),
    stopSuggestion: result.stopSuggestion,
    isSample: asset.isSample,
    styleLabel,
  };

  // Cache by symbol + style + profile + score + signal so each timeframe and
  // combination gets its own take, and we don't re-call Claude on every view.
  const cached = unstable_cache(
    () => generate(input),
    [
      "ai-explain",
      `${asset.symbol}:${styleLabel}:${result.profileId}:${result.score}:${result.signal}`,
    ],
    { revalidate: 3600 }
  );
  return cached();
}
