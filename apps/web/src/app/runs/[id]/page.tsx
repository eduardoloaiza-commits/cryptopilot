import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cryptopilot/db";
import { Badge } from "@/components/ui/badge";
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
          <div className="text-xs text-[color:var(--muted)] mb-1">
            <Link href="/runs" className="hover:underline">
              ← Corridas
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {run.label ?? `Run ${run.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Inicio {run.startedAt.toLocaleString("es-CL")} · Fin programado{" "}
            {run.endsAt.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
          {run.status === "running" && <CancelRunButton runId={run.id} />}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Equity inicio" value={`$${startEquity.toFixed(2)}`} />
        <Stat
          label="Equity fin"
          value={endEquity != null ? `$${endEquity.toFixed(2)}` : "— en curso"}
        />
        <Stat
          label="P&L"
          value={pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          tone={pnl == null ? undefined : pnl >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="rounded-lg border border-white/10 p-5">
        <h2 className="text-sm font-medium mb-3">Reporte</h2>
        {run.reportMd ? (
          <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono">
            {run.reportMd}
          </pre>
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            {run.status === "running"
              ? "La corrida aún está en curso. El reporte se genera automáticamente cuando el worker detecta que pasó la hora de fin."
              : "Esta corrida no tiene reporte registrado."}
          </p>
        )}
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
      ? "text-[color:var(--accent)]"
      : tone === "negative"
        ? "text-[color:var(--danger)]"
        : "";
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "running") return <Badge variant="info">Running</Badge>;
  if (status === "completed") return <Badge variant="default">Completed</Badge>;
  if (status === "cancelled") return <Badge variant="muted">Cancelled</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}
