import { listTrades, listDistinctTradeSymbols, type TradeFilters } from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";

export const dynamic = "force-dynamic";

const SIDES = ["BUY", "SELL"] as const;
const STATUSES = ["OPEN", "CLOSED", "CANCELLED"] as const;

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function TradesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters: TradeFilters = {};
  const symbol = typeof sp.symbol === "string" ? sp.symbol : undefined;
  const side = typeof sp.side === "string" ? sp.side : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  if (symbol) filters.symbol = symbol;
  if (side === "BUY" || side === "SELL") filters.side = side;
  if (status === "OPEN" || status === "CLOSED" || status === "CANCELLED") filters.status = status;

  const [trades, symbols] = await Promise.all([
    listTrades(300, filters),
    listDistinctTradeSymbols(),
  ]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="display-mono text-on-surface uppercase">Trade History</h1>
        <p className="label-caps text-outline mt-1">
          {trades.length} REGISTROS · PORTFOLIO ACTIVO
        </p>
      </header>

      <FilterBar
        basePath="/trades"
        active={sp}
        fields={[
          { name: "symbol", label: "Symbol", options: symbols },
          { name: "side", label: "Side", options: SIDES as unknown as string[] },
          { name: "status", label: "Status", options: STATUSES as unknown as string[] },
        ]}
      />

      {trades.length === 0 ? (
        <div className="bg-surface border border-white/10 p-8 text-center">
          <p className="text-[13px] text-outline italic">No trades match the current filters.</p>
        </div>
      ) : (
        <div className="bg-surface border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[12px]">
              <thead>
                <tr className="bg-white/[0.03] text-outline">
                  <th className="px-4 py-3 label-caps">Time</th>
                  <th className="px-4 py-3 label-caps">Symbol</th>
                  <th className="px-4 py-3 label-caps">Side</th>
                  <th className="px-4 py-3 label-caps text-right">Qty</th>
                  <th className="px-4 py-3 label-caps text-right">Entry</th>
                  <th className="px-4 py-3 label-caps text-right">Exit</th>
                  <th className="px-4 py-3 label-caps text-right">SL</th>
                  <th className="px-4 py-3 label-caps text-right">TP</th>
                  <th className="px-4 py-3 label-caps text-right">P&amp;L</th>
                  <th className="px-4 py-3 label-caps">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trades.map((t, i) => {
                  const pnl = t.pnlUsdt != null ? Number(t.pnlUsdt) : null;
                  return (
                    <tr
                      key={t.id}
                      className={i % 2 === 0 ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/[0.03]"}
                    >
                      <td className="px-4 py-3 text-outline">
                        {new Date(t.openedAt).toLocaleString("es-CL", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{t.symbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1 text-[10px] border ${t.side === "BUY" ? "text-primary border-primary/30" : "text-error border-error/30"}`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{Number(t.qty).toFixed(6)}</td>
                      <td className="px-4 py-3 text-right">${Number(t.entryPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-outline">
                        {t.exitPrice != null ? `$${Number(t.exitPrice).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-error/70">
                        ${Number(t.stopLoss).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-primary/70">
                        {t.takeProfit ? `$${Number(t.takeProfit).toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={
                          pnl == null
                            ? "px-4 py-3 text-right text-outline"
                            : pnl >= 0
                              ? "px-4 py-3 text-right text-primary font-bold"
                              : "px-4 py-3 text-right text-error font-bold"
                        }
                      >
                        {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "OPEN"
      ? "text-blue-300 border-blue-400/40"
      : status === "CLOSED"
        ? "text-outline border-white/20"
        : "text-error border-error/40";
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] border ${cls}`}>
      {status}
    </span>
  );
}
