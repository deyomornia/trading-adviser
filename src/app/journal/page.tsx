import { getTrades } from "@/lib/journal";
import { getUserTier } from "@/lib/tier";
import { canAccess } from "@/lib/access";
import { addTrade, closeTrade, deleteTrade } from "./actions";
import UpgradePrompt from "@/components/UpgradePrompt";
import type { Trade } from "@/types";

function fmt(n: number | null) {
  return n === null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

function AddTradeForm() {
  return (
    <form action={addTrade} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Log a trade
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Symbol</label>
          <input name="symbol" required placeholder="BTC" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Direction</label>
          <select name="direction" className={inputClass} defaultValue="long">
            <option value="long">Long (expect up)</option>
            <option value="short">Short (expect down)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Entry price</label>
          <input name="entry" required type="number" step="any" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Stop-loss</label>
          <input name="stop_loss" type="number" step="any" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Target</label>
          <input name="target" type="number" step="any" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Position size</label>
          <input name="position_size" type="number" step="any" className={inputClass} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-slate-700">
            Notes / reason / lesson
          </label>
          <textarea name="notes" rows={2} className={inputClass} />
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Add to journal
      </button>
    </form>
  );
}

function OpenTradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-medium text-slate-900">{trade.symbol}</span>{" "}
          <span className="text-xs capitalize text-slate-500">{trade.direction}</span>
          <div className="mt-1 text-sm text-slate-600">
            Entry {fmt(trade.entry)} · Stop {fmt(trade.stop_loss)} · Target {fmt(trade.target)}
            {trade.position_size != null && <> · Size {fmt(trade.position_size)}</>}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">Opened {fmtDate(trade.opened_at)}</div>
          {trade.notes && <p className="mt-2 text-sm text-slate-600">{trade.notes}</p>}
        </div>

        <div className="flex items-end gap-2">
          <form action={closeTrade} className="flex items-end gap-2">
            <input type="hidden" name="id" value={trade.id} />
            <div>
              <label className="block text-xs text-slate-500">Exit price</label>
              <input
                name="exit"
                required
                type="number"
                step="any"
                className="mt-1 w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Close
            </button>
          </form>
          <form action={deleteTrade}>
            <input type="hidden" name="id" value={trade.id} />
            <button
              type="submit"
              className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-red-600"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ClosedTradeRow({ trade }: { trade: Trade }) {
  const win = trade.result != null && trade.result >= 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <span className="font-medium text-slate-900">{trade.symbol}</span>{" "}
        <span className="text-xs capitalize text-slate-500">{trade.direction}</span>
        <div className="mt-1 text-sm text-slate-600">
          Entry {fmt(trade.entry)} → Exit {fmt(trade.exit)}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">Closed {fmtDate(trade.closed_at)}</div>
        {trade.notes && <p className="mt-2 text-sm text-slate-600">{trade.notes}</p>}
      </div>
      <div className="flex items-center gap-4">
        {trade.result != null ? (
          <span
            className={`text-lg font-semibold tabular-nums ${win ? "text-emerald-600" : "text-red-600"}`}
          >
            {win ? "+" : ""}
            {fmt(trade.result)}
          </span>
        ) : (
          <span className="text-sm text-slate-400">no size recorded</span>
        )}
        <form action={deleteTrade}>
          <input type="hidden" name="id" value={trade.id} />
          <button
            type="submit"
            className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-red-600"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function JournalPage() {
  const tier = await getUserTier();

  const header = (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Trade Journal</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Record every trade — entry, exit, result, and lessons — so you can learn
        from your own history. Your journal is private to your account.
      </p>
    </>
  );

  // Paid feature: free users see an upgrade prompt instead of the journal.
  if (!canAccess(tier, "journal")) {
    return (
      <div>
        {header}
        <UpgradePrompt feature="The Trade Journal" />
      </div>
    );
  }

  const trades = await getTrades();
  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");

  return (
    <div>
      {header}

      <div className="mt-6">
        <AddTradeForm />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open trades ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            No open trades yet. Log one above to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {open.map((t) => (
              <OpenTradeRow key={t.id} trade={t} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Closed trades ({closed.length})
        </h2>
        {closed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Closed trades will appear here with their result.
          </p>
        ) : (
          <div className="space-y-3">
            {closed.map((t) => (
              <ClosedTradeRow key={t.id} trade={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
