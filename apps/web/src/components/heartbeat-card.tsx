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
  online: "ONLINE",
  stale: "STALE",
  error: "ERROR",
  offline: "OFFLINE",
  unknown: "NO DATA",
};

const COLOR: Record<HeartbeatHealth, string> = {
  online: "text-primary",
  stale: "text-tertiary",
  error: "text-error",
  offline: "text-error",
  unknown: "text-outline",
};

const DOT: Record<HeartbeatHealth, string> = {
  online: "bg-primary animate-pulse",
  stale: "bg-tertiary",
  error: "bg-error",
  offline: "bg-error",
  unknown: "bg-outline",
};

function uptime(start: Date): string {
  const sec = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}M`;
  return `${h}H`;
}

export function HeartbeatCard({ health, heartbeat }: Props) {
  return (
    <div className="bg-surface p-4">
      <div className="label-caps text-on-surface-variant mb-2">WORKER</div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 ${DOT[health]}`} />
        <span className={`headline-sm ${COLOR[health]}`}>{LABEL[health]}</span>
      </div>
      {heartbeat ? (
        <div className="flex justify-between font-mono text-[10px] text-outline uppercase">
          <span>CYCLES: {heartbeat.cycleCount}</span>
          <span>UPTIME: {uptime(heartbeat.startedAt)}</span>
        </div>
      ) : (
        <div className="font-mono text-[10px] text-outline uppercase">NO HEARTBEAT</div>
      )}
      {heartbeat?.lastError && (
        <div className="mt-2 font-mono text-[9px] text-error truncate" title={heartbeat.lastError}>
          ERR: {heartbeat.lastError.slice(0, 60)}
        </div>
      )}
    </div>
  );
}
