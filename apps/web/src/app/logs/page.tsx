import { listAgentLogs, type LogFilters } from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLES = ["ORCHESTRATOR", "ANALYST", "TRADER", "RISK_MANAGER", "ACCOUNTANT", "RESEARCHER"];
const PHASES = ["SCAN", "DECIDE", "EXECUTE", "REPORT", "SWEEP"];
const LEVELS = ["info", "warn", "error"];

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function LogsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters: LogFilters = {};
  const role = typeof sp.role === "string" ? sp.role : undefined;
  const phase = typeof sp.phase === "string" ? sp.phase : undefined;
  const level = typeof sp.level === "string" ? sp.level : undefined;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  if (role && (ROLES as string[]).includes(role)) filters.role = role as LogFilters["role"];
  if (phase && (PHASES as string[]).includes(phase)) filters.phase = phase as LogFilters["phase"];
  if (level && (LEVELS as string[]).includes(level)) filters.level = level as LogFilters["level"];
  if (search && search.length >= 2) filters.search = search;

  const logs = await listAgentLogs(200, filters);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="display-mono text-on-surface uppercase">Agent Logs</h1>
        <p className="label-caps text-outline mt-1">
          {logs.length} INVOCACIONES · CLAUDE AGENT SDK
        </p>
      </header>

      <FilterBar
        basePath="/logs"
        active={sp}
        fields={[
          { name: "role", label: "Role", options: ROLES },
          { name: "phase", label: "Phase", options: PHASES },
          { name: "level", label: "Level", options: LEVELS },
        ]}
        searchField={{ name: "search", placeholder: "search reasoning/tool…" }}
      />

      {logs.length === 0 ? (
        <div className="bg-surface border border-white/10 p-8 text-center">
          <p className="text-[13px] text-outline italic">No logs match current filters.</p>
        </div>
      ) : (
        <ul className="space-y-px bg-white/10 border border-white/10">
          {logs.map((log) => {
            const badgeVariant =
              log.level === "error" ? "destructive" : log.level === "warn" ? "warn" : "default";
            const borderColor =
              log.level === "error"
                ? "border-error"
                : log.level === "warn"
                  ? "border-tertiary"
                  : "border-primary/60";
            return (
              <li
                key={log.id}
                className={`bg-surface p-4 border-l-2 ${borderColor}`}
              >
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-mono text-[10px] text-outline">
                    {new Date(log.ts).toLocaleString("es-CL", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <Badge variant={badgeVariant}>{log.role}</Badge>
                  <span className="label-caps text-on-surface-variant">PHASE: {log.phase}</span>
                  {log.toolName && (
                    <span className="font-mono text-[10px] text-outline">
                      TOOL: {log.toolName}
                    </span>
                  )}
                  <span
                    className={`label-caps ml-auto ${log.level === "error" ? "text-error" : log.level === "warn" ? "text-tertiary" : "text-primary"}`}
                  >
                    {log.level}
                  </span>
                </div>
                {log.reasoningMd && (
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-on-surface-variant font-sans max-h-40 overflow-y-auto custom-scrollbar">
                    {log.reasoningMd.slice(0, 1200)}
                    {log.reasoningMd.length > 1200 ? "…" : ""}
                  </pre>
                )}
                {log.output != null && (
                  <details className="mt-2">
                    <summary className="cursor-pointer label-caps text-outline hover:text-on-surface">
                      OUTPUT JSON
                    </summary>
                    <pre className="mt-2 font-mono text-[10px] text-outline whitespace-pre-wrap bg-surface-container-lowest p-2 border border-white/5">
                      {JSON.stringify(log.output, null, 2).slice(0, 2000)}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
