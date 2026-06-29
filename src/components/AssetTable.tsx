import type { Asset } from "@/types";

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">24h Change</th>
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
                    <span className="font-medium text-slate-900">{a.name}</span>{" "}
                    <span className="text-slate-400">{a.symbol}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{a.type}</td>
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
                    {a.isSample && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        SAMPLE
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
