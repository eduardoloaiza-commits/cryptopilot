import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cryptopilot/db";
import { CancelRunButton } from "@/components/cancel-run-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await prisma.evaluationRun.findUnique({ where: { id } });
  if (!run) notFound();

  const startEquity = Number(run.startEquity);
  const endEquity = run.endEquity != null ? Number(run.endEquity) : null;
  const pnl = endEquity != null ? endEquity - startEquity : null;

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/runs"
            className="label-caps text-outline hover:text-primary"
          >
            ← BACK TO RUNS
          </Link>
          <h1 className="display-mono text-on-surface uppercase mt-2">
            {run.label ?? `Run ${run.id.slice(0, 8)}`}
          </h1>
          <p className="label-caps text-outline mt-1">
            STARTED {run.startedAt.toLocaleString("es-CL")} · ENDS {run.endsAt.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip status={run.status} />
          {run.status === "running" && <CancelRunButton runId={run.id} />}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 border border-white/10">
        <Stat label="EQUITY START" value={`$${startEquity.toFixed(2)}`} />
        <Stat
          label="EQUITY END"
          value={endEquity != null ? `$${endEquity.toFixed(2)}` : "— IN PROGRESS"}
        />
        <Stat
          label="P&L"
          value={pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          tone={pnl == null ? undefined : pnl >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="bg-surface border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h2 className="label-caps text-on-surface">REPORT</h2>
        </div>
        <div className="p-5">
          {run.reportMd ? (
            <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-mono text-on-surface">
              {run.reportMd}
            </pre>
          ) : (
            <p className="text-[13px] text-outline italic">
              {run.status === "running"
                ? "Run in progress — the worker generates the report automatically when the end time is reached."
                : "No report registered for this run."}
            </p>
          )}
        </div>
      </section>
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
    <div className="bg-surface p-4">
      <div className="label-caps text-on-surface-variant mb-2">{label}</div>
      <div className={`display-mono ${color}`}>{value}</div>
    </div>
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
