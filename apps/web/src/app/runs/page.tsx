import Link from "next/link";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";
import { RunStartForm } from "@/components/run-start-form";
import { CancelRunButton } from "@/components/cancel-run-button";
import { AdjustRunButton } from "@/components/adjust-run-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}M`;
  if (hours < 24) return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}H`;
  return `${(hours / 24).toFixed(1)}D`;
}

export default async function RunsPage() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    return (
      <main>
        <h1 className="display-mono text-on-surface uppercase">Runs</h1>
        <p className="mt-4 text-[13px] text-outline">No hay portfolio activo.</p>
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
        <h1 className="display-mono text-on-surface uppercase">Evaluation Runs</h1>
        <p className="label-caps text-outline mt-1">
          TIMEBOXED EXPERIMENTS · AUTO-GENERATED REPORT ON EXPIRY
        </p>
      </header>

      <RunStartForm disabled={Boolean(active)} />

      {runs.length === 0 ? (
        <div className="bg-surface border border-white/10 p-8 text-center">
          <p className="text-[13px] text-outline italic">
            No runs yet — start one above.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-white/10 overflow-hidden">
          <table className="w-full text-left font-mono text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] text-outline">
                <th className="px-4 py-3 label-caps">Label</th>
                <th className="px-4 py-3 label-caps">Status</th>
                <th className="px-4 py-3 label-caps">Started</th>
                <th className="px-4 py-3 label-caps">Progress</th>
                <th className="px-4 py-3 label-caps text-right">P&amp;L</th>
                <th className="px-4 py-3 label-caps text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {runs.map((r, i) => {
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
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/[0.03]"}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/runs/${r.id}`} className="text-on-surface hover:text-primary">
                        {r.label ?? `Run ${r.id.slice(0, 6)}`}
                      </Link>
                      <div className="label-caps text-outline mt-0.5">
                        DURACIÓN {fmtDuration(totalH)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-outline">
                      {r.startedAt.toLocaleString("es-CL", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "running" ? (
                        <div className="min-w-[140px]">
                          <div className="font-mono text-[10px] text-outline uppercase">
                            ENDS {r.endsAt.toLocaleString("es-CL", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="h-1 mt-1 bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : r.finalizedAt ? (
                        <span className="text-outline">
                          ENDED {r.finalizedAt.toLocaleString("es-CL", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pnl == null ? (
                        <span className="text-outline">—</span>
                      ) : (
                        <span className={pnl >= 0 ? "text-primary font-bold" : "text-error font-bold"}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "running" && (
                        <div className="flex items-center gap-1 justify-end">
                          <AdjustRunButton runId={r.id} currentTotalHours={totalH} />
                          <CancelRunButton runId={r.id} />
                        </div>
                      )}
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

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "running"
      ? "text-blue-300 border-blue-400/40"
      : status === "completed"
        ? "text-primary border-primary/40"
        : "text-outline border-white/20";
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] border ${cls}`}>
      {status}
    </span>
  );
}
