import type { AgentHealthSummary, AgentRoleLabel } from "@/lib/queries";

interface Props {
  health: AgentHealthSummary;
}

const ROLE_SHORT: Record<AgentRoleLabel, string> = {
  ORCHESTRATOR: "ORQ",
  ANALYST: "ANA",
  TRADER: "TRD",
  RISK_MANAGER: "RSK",
  ACCOUNTANT: "ACC",
  RESEARCHER: "RES",
};

function ageMin(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
}

function ageColor(min: number | null): string {
  if (min === null) return "text-outline";
  if (min < 10) return "text-primary";
  if (min < 30) return "text-tertiary";
  return "text-error";
}

function ageDot(min: number | null): string {
  if (min === null) return "bg-outline";
  if (min < 10) return "bg-primary";
  if (min < 30) return "bg-tertiary";
  return "bg-error";
}

function ageLabel(min: number | null): string {
  if (min === null) return "—";
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export function AgentHealthCard({ health }: Props) {
  const hasErrors = health.errors24h > 0;
  return (
    <div className="bg-surface border border-white/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="label-caps text-on-surface">SALUD DE AGENTES</div>
        <div className="flex gap-3 font-mono text-[10px] uppercase">
          <span className="text-outline">
            1H:{" "}
            <span className={health.errors1h > 0 ? "text-error" : "text-on-surface"}>
              {health.errors1h} ERR
            </span>
          </span>
          <span className="text-outline">
            24H:{" "}
            <span className={health.errors24h > 0 ? "text-error" : "text-on-surface"}>
              {health.errors24h} ERR
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-px bg-white/10 border border-white/10">
        {health.perRole.map((r) => {
          const min = ageMin(r.lastSuccessAt);
          return (
            <div key={r.role} className="bg-surface px-2 py-3 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 ${ageDot(min)}`} />
                <span className="label-caps text-on-surface-variant text-[9px]">
                  {ROLE_SHORT[r.role]}
                </span>
              </div>
              <div className={`headline-sm font-mono ${ageColor(min)}`}>{ageLabel(min)}</div>
            </div>
          );
        })}
      </div>

      {hasErrors && health.topErrors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="label-caps text-on-surface-variant mb-2">TOP ERRORES 24H</div>
          <ul className="space-y-1">
            {health.topErrors.map((e, i) => (
              <li
                key={i}
                className="flex justify-between gap-3 font-mono text-[10px] leading-tight"
              >
                <span className="text-error/80 truncate flex-1" title={e.reason}>
                  {e.reason}
                </span>
                <span className="text-outline shrink-0">×{e.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
