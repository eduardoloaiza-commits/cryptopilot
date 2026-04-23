import { listDailyReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await listDailyReports(30);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Daily Reports</h1>
      <p className="text-sm text-[color:var(--muted)]">
        Los genera el Contador al cierre de cada día (23:59 America/Santiago).
      </p>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-6 text-sm text-[color:var(--muted)]">
          Sin reportes aún.
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((r) => {
            const pnl = Number(r.pnlUsdt);
            return (
              <article key={r.id} className="rounded-lg border border-white/10 p-6">
                <header className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <h2 className="text-lg font-semibold">
                    {new Date(r.date).toISOString().slice(0, 10)}
                  </h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <span className="text-[color:var(--muted)]">P&amp;L</span>{" "}
                      <span
                        className={
                          pnl >= 0
                            ? "text-[color:var(--accent)]"
                            : "text-[color:var(--danger)]"
                        }
                      >
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                    </span>
                    <span className="text-[color:var(--muted)]">
                      {r.tradesCount} trades · winrate {(Number(r.winrate) * 100).toFixed(1)}%
                    </span>
                  </div>
                </header>
                <pre className="whitespace-pre-wrap text-sm text-[color:var(--fg)] font-sans">
                  {r.summaryMd}
                </pre>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
