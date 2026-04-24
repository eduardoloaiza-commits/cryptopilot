import type { HeartbeatHealth } from "@/lib/queries";

interface Props {
  health: HeartbeatHealth;
  heartbeat: {
    status: string;
    mode: string;
    cycleCount: number;
    lastCycleAt: Date | null;
    lastCycleMs: number | null;
    lastError: string | null;
    startedAt: Date;
  } | null;
}

const LABEL: Record<HeartbeatHealth, string> = {
  online: "Online",
  stale: "Stale",
  error: "Error",
  offline: "Offline",
  unknown: "Sin datos",
};

const DOT: Record<HeartbeatHealth, string> = {
  online: "bg-emerald-400",
  stale: "bg-yellow-400",
  error: "bg-red-500",
  offline: "bg-red-500",
  unknown: "bg-gray-500",
};

function relativeTime(d: Date): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return `hace ${Math.floor(diff)}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function uptime(start: Date): string {
  const sec = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const min = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

export function HeartbeatCard({ health, heartbeat }: Props) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[color:var(--muted)]">
        <span className={`inline-block size-2 rounded-full ${DOT[health]} ${health === "online" ? "animate-pulse" : ""}`} />
        Worker
      </div>
      <div className="mt-1 text-2xl font-semibold">{LABEL[health]}</div>
      {heartbeat ? (
        <div className="mt-2 space-y-1 text-xs text-[color:var(--muted)]">
          <div>
            modo <span className="text-[color:var(--fg)]">{heartbeat.mode}</span> · ciclos{" "}
            <span className="text-[color:var(--fg)]">{heartbeat.cycleCount}</span>
            {heartbeat.lastCycleMs != null ? ` · último ${heartbeat.lastCycleMs}ms` : ""}
          </div>
          <div>
            último heartbeat{" "}
            <span className="text-[color:var(--fg)]">
              {heartbeat.lastCycleAt ? relativeTime(heartbeat.lastCycleAt) : "—"}
            </span>
          </div>
          <div>uptime {uptime(heartbeat.startedAt)}</div>
          {heartbeat.lastError && (
            <div className="text-[color:var(--danger)] truncate" title={heartbeat.lastError}>
              err: {heartbeat.lastError.slice(0, 80)}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-xs text-[color:var(--muted)]">Aún no hay heartbeat registrado.</div>
      )}
    </div>
  );
}
