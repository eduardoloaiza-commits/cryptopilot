import Link from "next/link";

interface FilterField {
  name: string;
  label: string;
  options: string[];
}

interface Props {
  basePath: string;
  active: Record<string, string | string[] | undefined>;
  fields: FilterField[];
  searchField?: { name: string; placeholder?: string };
}

function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

function flatten(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    out[k] = typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  }
  return out;
}

export function FilterBar({ basePath, active, fields, searchField }: Props) {
  const current = flatten(active);
  const anyActive = fields.some((f) => current[f.name]) || (searchField && current[searchField.name]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 p-3 bg-white/[0.015]">
      {fields.map((f) => (
        <div key={f.name} className="flex items-center gap-1 text-xs">
          <span className="text-[color:var(--muted)]">{f.label}:</span>
          <Link
            href={buildUrl(basePath, { ...current, [f.name]: undefined })}
            className={
              current[f.name]
                ? "rounded px-2 py-1 border border-white/10 text-[color:var(--muted)] hover:bg-white/5"
                : "rounded px-2 py-1 border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
            }
          >
            todos
          </Link>
          {f.options.map((opt) => (
            <Link
              key={opt}
              href={buildUrl(basePath, { ...current, [f.name]: opt })}
              className={
                current[f.name] === opt
                  ? "rounded px-2 py-1 border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                  : "rounded px-2 py-1 border border-white/10 text-[color:var(--muted)] hover:bg-white/5"
              }
            >
              {opt}
            </Link>
          ))}
        </div>
      ))}
      {searchField && (
        <form action={basePath} className="ml-auto flex items-center gap-2">
          {/* preserve other filters */}
          {Object.entries(current)
            .filter(([k]) => k !== searchField.name)
            .map(([k, v]) =>
              v ? <input key={k} type="hidden" name={k} value={v} /> : null,
            )}
          <input
            type="text"
            name={searchField.name}
            placeholder={searchField.placeholder ?? "Buscar…"}
            defaultValue={current[searchField.name] ?? ""}
            className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs w-52"
          />
        </form>
      )}
      {anyActive && (
        <Link
          href={basePath}
          className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)] underline"
        >
          limpiar
        </Link>
      )}
    </div>
  );
}
