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
      <h1 className="text-2xl font-semibold">Trades</h1>

      <FilterBar
        basePath="/trades"
        active={sp}
        fields={[
          { name: "symbol", label: "Símbolo", options: symbols },
          { name: "side", label: "Side", options: SIDES as unknown as string[] },
          { name: "status", label: "Status", options: STATUSES as unknown as string[] },
        ]}
      />

      <p className="text-sm text-[color:var(--muted)]">
        Mostrando {trades.length} trades.
      </p>

      {trades.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-6 text-sm text-[color:var(--muted)]">
          Sin trades que coincidan con los filtros.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--muted)] bg-white/[0.02]">
              <tr>
                <th className="text-left px-4 py-2">Abierta</th>
                <th className="text-left px-4 py-2">Símbolo</th>
                <th className="text-left px-4 py-2">Side</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-right px-4 py-2">Entry</th>
                <th className="text-right px-4 py-2">Exit</th>
                <th className="text-right px-4 py-2">SL</th>
                <th className="text-right px-4 py-2">TP</th>
                <th className="text-right px-4 py-2">P&amp;L</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pnl = t.pnlUsdt != null ? Number(t.pnlUsdt) : null;
                return (
                  <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-xs text-[color:var(--muted)]">
                      {new Date(t.openedAt).toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-2 font-medium">{t.symbol}</td>
                    <td
                      className={
                        t.side === "BUY"
                          ? "px-4 py-2 text-[color:var(--accent)]"
                          : "px-4 py-2 text-[color:var(--danger)]"
                      }
                    >
                      {t.side}
                    </td>
                    <td className="px-4 py-2 text-right">{Number(t.qty).toFixed(6)}</td>
                    <td className="px-4 py-2 text-right">${Number(t.entryPrice).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-[color:var(--muted)]">
                      {t.exitPrice != null ? `$${Number(t.exitPrice).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-[color:var(--muted)]">
                      ${Number(t.stopLoss).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-[color:var(--muted)]">
                      {t.takeProfit ? `$${Number(t.takeProfit).toFixed(2)}` : "—"}
                    </td>
                    <td
                      className={
                        pnl == null
                          ? "px-4 py-2 text-right text-[color:var(--muted)]"
                          : pnl >= 0
                            ? "px-4 py-2 text-right text-[color:var(--accent)]"
                            : "px-4 py-2 text-right text-[color:var(--danger)]"
                      }
                    >
                      {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "OPEN"
      ? "bg-blue-500/20 text-blue-300"
      : status === "CLOSED"
        ? "bg-white/5 text-[color:var(--muted)]"
        : "bg-[color:var(--danger)]/20 text-[color:var(--danger)]";
  return <span className={`px-2 py-0.5 rounded text-[10px] ${tone}`}>{status}</span>;
}
