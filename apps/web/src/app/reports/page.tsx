import { listDailyReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await listDailyReports(30);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="display-mono text-on-surface uppercase">Daily Reports</h1>
        <p className="label-caps text-outline mt-1">
          GENERADOS POR EL CONTADOR · 23:59 AMERICA/SANTIAGO
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="bg-surface border border-white/10 p-8 text-center">
          <p className="text-[13px] text-outline italic">Sin reportes aún.</p>
        </div>
      ) : (
        <div className="space-y-px bg-white/10 border border-white/10">
          {reports.map((r) => {
            const pnl = Number(r.pnlUsdt);
            const pnlPct = Number(r.pnlPct);
            const winrate = Number(r.winrate);
            return (
              <article key={r.id} className="bg-surface p-6">
                <header className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 flex-wrap gap-3">
                  <h2 className="display-mono text-on-surface">
                    {new Date(r.date).toISOString().slice(0, 10)}
                  </h2>
                  <div className="flex items-center gap-6 flex-wrap">
                    <Stat
                      label="P&L"
                      value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                      tone={pnl >= 0 ? "positive" : "negative"}
                    />
                    <Stat
                      label="%"
                      value={`${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(3)}%`}
                      tone={pnlPct >= 0 ? "positive" : "negative"}
                    />
                    <Stat label="Trades" value={`${r.tradesCount}`} />
                    <Stat
                      label="Winrate"
                      value={`${(winrate * 100).toFixed(1)}%`}
                      tone={winrate >= 0.5 ? "positive" : "negative"}
                    />
                    <Stat
                      label="Max DD"
                      value={`${(Number(r.maxDrawdown) * 100).toFixed(2)}%`}
                      tone="negative"
                    />
                  </div>
                </header>
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-on-surface font-sans">
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-primary"
      : tone === "negative"
        ? "text-error"
        : "text-on-surface";
  return (
    <div className="flex flex-col items-start">
      <span className="label-caps text-outline">{label}</span>
      <span className={`font-mono text-[13px] font-medium ${color}`}>{value}</span>
    </div>
  );
}
