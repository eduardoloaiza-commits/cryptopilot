import Link from "next/link";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";
import { RunStartForm } from "@/components/run-start-form";
import { CancelRunButton } from "@/components/cancel-run-button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default async function RunsPage() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Corridas</h1>
        <p className="mt-4 text-[color:var(--muted)]">No hay portfolio activo.</p>
      </main>
    );
  }
  const runs = await prisma.evaluationRun.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  const active = runs.find((r) => r.status === "running");

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Corridas</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Evaluaciones timeboxed. Al expirar, el worker genera un reporte con P&L,
          winrate, exit reasons y costo LLM del período.
        </p>
      </header>

      <RunStartForm disabled={Boolean(active)} />

      {runs.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-8 text-center text-sm text-[color:var(--muted)]">
          Aún no hay corridas. Inicia una arriba para generar el primer reporte.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-[color:var(--muted)] bg-white/[0.02]">
              <tr>
                <th className="text-left px-4 py-2">Etiqueta</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Inicio</th>
                <th className="text-left px-4 py-2">Fin / Progreso</th>
                <th className="text-right px-4 py-2">P&amp;L</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const startMs = r.startedAt.getTime();
                const endMs = r.endsAt.getTime();
                const totalH = (endMs - startMs) / 3_600_000;
                const nowMs = Date.now();
                const progress =
                  r.status === "running"
                    ? Math.min(1, (nowMs - startMs) / (endMs - startMs))
                    : 1;
                const pnl =
                  r.endEquity != null
                    ? Number(r.endEquity) - Number(r.startEquity)
                    : null;
                return (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/runs/${r.id}`} className="hover:underline">
                        {r.label ?? `Run ${r.id.slice(0, 6)}`}
                      </Link>
                      <div className="text-xs text-[color:var(--muted)]">
                        duración {fmtDuration(totalH)}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-[color:var(--muted)]">
                      {r.startedAt.toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.status === "running" ? (
                        <div>
                          <div className="text-[color:var(--muted)]">
                            termina {r.endsAt.toLocaleString("es-CL")}
                          </div>
                          <div className="h-1 mt-1 bg-white/5 rounded overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--sh-primary))]"
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : r.finalizedAt ? (
                        <span className="text-[color:var(--muted)]">
                          {r.finalizedAt.toLocaleString("es-CL")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs">
                      {pnl == null ? (
                        "—"
                      ) : (
                        <span
                          className={
                            pnl >= 0
                              ? "text-[color:var(--accent)]"
                              : "text-[color:var(--danger)]"
                          }
                        >
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "running" && <CancelRunButton runId={r.id} />}
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
  if (status === "running") return <Badge variant="info">Running</Badge>;
  if (status === "completed") return <Badge variant="default">Completed</Badge>;
  if (status === "cancelled") return <Badge variant="muted">Cancelled</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}
