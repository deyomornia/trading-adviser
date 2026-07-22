import Link from "next/link";
import type { Asset } from "@/types";
import SignalInfo from "@/components/SignalInfo";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 65
      ? "bg-green-100 text-green-800"
      : score >= 40
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

export default function AssetTable({
  title,
  assets,
}: {
  title: string;
  assets: Asset[];
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium">Signal</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Type</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">24h</th>
              <th className="px-4 py-2 text-right font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const up = a.dailyChangePct >= 0;
              return (
                <tr
                  key={a.symbol}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link href={`/assets/${a.symbol}`} className="group">
                      <span className="font-medium text-slate-900 group-hover:underline">
                        {a.name}
                      </span>{" "}
                      <span className="text-slate-400">{a.symbol}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {a.signal ? (
                      <SignalInfo signal={a.signal} score={a.score} detail={a.detail} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.score !== undefined ? (
                      <ScoreBadge score={a.score} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 capitalize text-slate-600 sm:table-cell">
                    {a.type}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {formatPrice(a.price, a.currency)}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right tabular-nums " +
                      (up ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {up ? "+" : ""}
                    {a.dailyChangePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.isSample ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        SAMPLE
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        LIVE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
