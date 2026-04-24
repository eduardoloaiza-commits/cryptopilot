import { getDashboard } from "@/lib/queries";
import { WorkerControls } from "@/components/kill-switch";
import { HeartbeatCard } from "@/components/heartbeat-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const data = await getDashboard();

  if (!data) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-4 text-[color:var(--muted)]">
          No hay portfolio activo. Arranca el worker una vez para que se cree:{" "}
          <code className="rounded bg-white/5 px-1">
            pnpm --filter @cryptopilot/worker dev
          </code>
        </p>
      </main>
    );
  }

  const {
    portfolio,
    openTrades,
    openCount,
    todayPnlUsdt,
    todayFeesUsdt,
    tradesClosedToday,
    lastLogs,
    heartbeat,
    heartbeatHealth,
  } = data;
  const equity = Number(portfolio.currentEquity);
  const initial = Number(portfolio.initialCapital);
  const cumulativeUsd = equity - initial;
  const cumulativePct = initial > 0 ? cumulativeUsd / initial : 0;
  const netToday = todayPnlUsdt + todayFeesUsdt;

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Portfolio{" "}
            <code className="rounded bg-white/5 px-1 text-xs">{portfolio.id.slice(0, 10)}</code> —
            inicio{" "}
            {new Date(portfolio.createdAt).toLocaleDateString("es-CL")}
          </p>
        </div>
        <WorkerControls
          killActive={portfolio.guardrails?.killSwitchTriggered ?? false}
          killReason={portfolio.guardrails?.killSwitchReason ?? null}
          paused={portfolio.guardrails?.paused ?? false}
          pausedReason={portfolio.guardrails?.pausedReason ?? null}
        />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <HeartbeatCard health={heartbeatHealth} heartbeat={heartbeat} />
        <Metric label="Equity" value={`$${equity.toFixed(2)}`} hint={`capital inicial $${initial.toFixed(2)}`} />
        <Metric
          label="Acumulado"
          value={`${cumulativeUsd >= 0 ? "+" : ""}$${cumulativeUsd.toFixed(2)}`}
          hint={`${(cumulativePct * 100).toFixed(3)}%`}
          tone={cumulativeUsd >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Hoy P&L"
          value={`${netToday >= 0 ? "+" : ""}$${netToday.toFixed(2)}`}
          hint={`${tradesClosedToday} trade${tradesClosedToday === 1 ? "" : "s"} cerrado${tradesClosedToday === 1 ? "" : "s"}`}
          tone={netToday >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Posiciones abiertas"
          value={`${openCount}`}
          hint={`máx ${portfolio.guardrails?.maxOpenPositions ?? 3}`}
        />
      </section>

      <section className="rounded-lg border border-white/10">
        <header className="border-b border-white/10 px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Posiciones abiertas</h2>
          <span className="text-xs text-[color:var(--muted)]">{openTrades.length}</span>
        </header>
        {openTrades.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[color:var(--muted)]">
            Sin posiciones abiertas. El Trader decide en cada ciclo (30s).
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--muted)]">
              <tr>
                <th className="text-left px-4 py-2">Símbolo</th>
                <th className="text-left px-4 py-2">Side</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-right px-4 py-2">Entrada</th>
                <th className="text-right px-4 py-2">SL</th>
                <th className="text-right px-4 py-2">TP</th>
                <th className="text-right px-4 py-2">Abierta</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="px-4 py-2 font-medium">{t.symbol}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        t.side === "BUY"
                          ? "text-[color:var(--accent)]"
                          : "text-[color:var(--danger)]"
                      }
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{Number(t.qty).toFixed(6)}</td>
                  <td className="px-4 py-2 text-right">${Number(t.entryPrice).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-[color:var(--muted)]">
                    ${Number(t.stopLoss).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-[color:var(--muted)]">
                    {t.takeProfit ? `$${Number(t.takeProfit).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-[color:var(--muted)]">
                    {relativeTime(t.openedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-white/10">
        <header className="border-b border-white/10 px-4 py-2">
          <h2 className="text-sm font-medium">Últimos agentes</h2>
        </header>
        {lastLogs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[color:var(--muted)]">Sin actividad aún.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {lastLogs.map((log) => (
              <li key={log.id} className="px-4 py-2 text-sm flex items-center gap-3">
                <span className="text-xs text-[color:var(--muted)] w-28">
                  {new Date(log.ts).toLocaleTimeString("es-CL")}
                </span>
                <span className="text-xs font-medium w-28 uppercase">{log.role}</span>
                <span className="text-xs text-[color:var(--muted)] w-20">{log.phase}</span>
                <span className="text-xs text-[color:var(--muted)] truncate">
                  {log.reasoningMd?.slice(0, 160) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-[color:var(--accent)]"
      : tone === "negative"
        ? "text-[color:var(--danger)]"
        : "";
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>}
    </div>
  );
}

function relativeTime(d: Date): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
