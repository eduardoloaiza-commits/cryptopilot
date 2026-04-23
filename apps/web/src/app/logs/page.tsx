import { listAgentLogs } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LogsPage() {
  const logs = await listAgentLogs(150);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agent Logs</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Últimas {logs.length} invocaciones. Cada fila es una llamada al Claude Agent SDK.
          </p>
        </div>
        <a
          href="/logs"
          className="text-xs text-[color:var(--muted)] underline hover:text-[color:var(--fg)]"
        >
          Refresh
        </a>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-6 text-sm text-[color:var(--muted)]">
          Sin logs aún.
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-lg border border-white/10 p-4 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                <span>{new Date(log.ts).toLocaleString("es-CL")}</span>
                <span className="rounded bg-white/5 px-2 py-0.5 font-medium text-[color:var(--fg)]">
                  {log.role}
                </span>
                <span className="rounded bg-white/5 px-2 py-0.5">{log.phase}</span>
                {log.toolName && <span className="text-[10px]">tool: {log.toolName}</span>}
                <span
                  className={
                    log.level === "error"
                      ? "text-[color:var(--danger)]"
                      : log.level === "warn"
                        ? "text-yellow-400"
                        : ""
                  }
                >
                  {log.level}
                </span>
              </div>
              {log.reasoningMd && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-[color:var(--muted)] max-h-40 overflow-y-auto">
                  {log.reasoningMd.slice(0, 1200)}
                  {log.reasoningMd.length > 1200 ? "…" : ""}
                </pre>
              )}
              {log.output != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[color:var(--muted)]">output</summary>
                  <pre className="mt-1 text-[10px] text-[color:var(--muted)] whitespace-pre-wrap">
                    {JSON.stringify(log.output, null, 2).slice(0, 2000)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
