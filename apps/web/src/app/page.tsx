import { getDashboard } from "@/lib/queries";
import { WorkerControls } from "@/components/kill-switch";
import { HeartbeatCard } from "@/components/heartbeat-card";
import { AgentHealthCard } from "@/components/agent-health-card";
import { EquityChart } from "@/components/equity-chart";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const data = await getDashboard();

  if (!data) {
    return (
      <main className="space-y-4">
        <h1 className="headline-sm text-on-surface uppercase">Dashboard</h1>
        <p className="text-[13px] text-outline">
          No hay portfolio activo. Arranca el worker una vez para que se cree.
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
    equitySeries,
    agentHealth,
  } = data;
  const equity = Number(portfolio.currentEquity);
  const initial = Number(portfolio.initialCapital);
  const cumulativeUsd = equity - initial;
  const cumulativePct = initial > 0 ? cumulativeUsd / initial : 0;
  const netToday = todayPnlUsdt + todayFeesUsdt;

  return (
    <main className="space-y-px">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="display-mono text-on-surface uppercase">Dashboard</h1>
          <p className="label-caps text-outline mt-1">
            PORTFOLIO {portfolio.id.slice(0, 10).toUpperCase()} ·{" "}
            INICIO {new Date(portfolio.createdAt).toLocaleDateString("es-CL")}
          </p>
        </div>
        <WorkerControls
          killActive={portfolio.guardrails?.killSwitchTriggered ?? false}
          killReason={portfolio.guardrails?.killSwitchReason ?? null}
          paused={portfolio.guardrails?.paused ?? false}
          pausedReason={portfolio.guardrails?.pausedReason ?? null}
        />
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-white/10 border border-white/10">
        <HeartbeatCard health={heartbeatHealth} heartbeat={heartbeat} />
        <Metric
          label="Equity"
          value={`$${equity.toFixed(2)}`}
          hint={`$${initial.toFixed(2)} INITIAL`}
        />
        <Metric
          label="Acumulado"
          value={`${cumulativeUsd >= 0 ? "+" : ""}$${cumulativeUsd.toFixed(2)}`}
          hint={`${(cumulativePct * 100).toFixed(3)}% ALL TIME`}
          tone={cumulativeUsd >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Hoy P&L"
          value={`${netToday >= 0 ? "+" : ""}$${netToday.toFixed(2)}`}
          hint={`${tradesClosedToday} TRADE${tradesClosedToday === 1 ? "" : "S"} CERRADO${tradesClosedToday === 1 ? "" : "S"}`}
          tone={netToday >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Posiciones"
          value={`${openCount}`}
          hint={`MÁX ${portfolio.guardrails?.maxOpenPositions ?? 3} SIMULTÁNEAS`}
        />
      </section>

      <section className="mt-px">
        <AgentHealthCard health={agentHealth} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-px mt-px bg-white/10 border border-white/10">
        <div className="lg:col-span-8 bg-surface">
          <EquityChart data={equitySeries} />
        </div>
        <div className="lg:col-span-4 bg-surface flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="label-caps text-on-surface">ÚLTIMOS AGENTES</h3>
            <span className="label-caps text-outline">{lastLogs.length}</span>
          </div>
          {lastLogs.length === 0 ? (
            <div className="px-4 py-8 text-[13px] text-outline">Sin actividad.</div>
          ) : (
            <ul className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 max-h-[380px]">
              {lastLogs.map((log) => (
                <li
                  key={log.id}
                  className="p-3 bg-white/[0.01] hover:bg-white/[0.02] border-l-2 border-transparent hover:border-primary/60"
                >
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant={log.level === "error" ? "destructive" : log.level === "warn" ? "warn" : "default"}>
                      {log.role}
                    </Badge>
                    <span className="font-mono text-[9px] text-outline">
                      {new Date(log.ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <p className="label-caps text-on-surface-variant mb-1">PHASE: {log.phase}</p>
                  <p className="text-[11px] text-on-surface leading-relaxed line-clamp-3">
                    {log.reasoningMd?.slice(0, 180) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-surface border border-white/10 mt-px">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="label-caps text-on-surface">POSICIONES ABIERTAS</h3>
          <span className="label-caps text-outline">{openTrades.length}</span>
        </div>
        {openTrades.length === 0 ? (
          <div className="px-4 py-8 text-[13px] text-outline text-center italic">
            Waiting for next signal…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[12px]">
              <thead>
                <tr className="bg-white/[0.03] text-outline">
                  <th className="px-4 py-3 label-caps">Symbol</th>
                  <th className="px-4 py-3 label-caps">Side</th>
                  <th className="px-4 py-3 label-caps text-right">Qty</th>
                  <th className="px-4 py-3 label-caps text-right">Entry</th>
                  <th className="px-4 py-3 label-caps text-right">SL</th>
                  <th className="px-4 py-3 label-caps text-right">TP</th>
                  <th className="px-4 py-3 label-caps text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {openTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
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
                    <td className="px-4 py-3 text-right text-error/70">
                      ${Number(t.stopLoss).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-primary/70">
                      {t.takeProfit ? `$${Number(t.takeProfit).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-outline">
                      {relativeTime(t.openedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      ? "text-primary"
      : tone === "negative"
        ? "text-error"
        : "text-on-surface";
  return (
    <div className="bg-surface p-4">
      <div className="label-caps text-on-surface-variant mb-2">{label}</div>
      <div className={`display-mono ${color}`}>{value}</div>
      {hint && <div className="font-mono text-[10px] text-outline mt-1 uppercase">{hint}</div>}
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
