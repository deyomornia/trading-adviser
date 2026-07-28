import { getTradePrefs } from "@/lib/prefs";
import TradePlanForm from "@/components/TradePlanForm";

export default async function TradePlanPage({
  searchParams,
}: {
  searchParams: Promise<{
    symbol?: string;
    entry?: string;
    stop?: string;
    target?: string;
    error?: string;
  }>;
}) {
  const [prefs, sp] = await Promise.all([getTradePrefs(), searchParams]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Trade Plan</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-ink-300">
        Decide whether a trade is worth taking <em>before</em> you enter. Risk
        control comes first — position size is based on what you can afford to
        lose, not on a hunch.
      </p>

      {sp.error && (
        <p className="mt-4 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">{sp.error}</p>
      )}

      <TradePlanForm
        defaults={prefs}
        initialSymbol={sp.symbol ?? ""}
        initialEntry={sp.entry ?? ""}
        initialStop={sp.stop ?? ""}
        initialTarget={sp.target ?? ""}
      />
    </div>
  );
}
