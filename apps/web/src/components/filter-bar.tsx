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
  const anyActive =
    fields.some((f) => current[f.name]) ||
    Boolean(searchField && current[searchField.name]);

  return (
    <div className="flex flex-wrap items-center gap-4 bg-surface border border-white/10 p-3">
      {fields.map((f) => (
        <div key={f.name} className="flex items-center gap-1">
          <span className="label-caps text-outline mr-1">{f.label}</span>
          <Link
            href={buildUrl(basePath, { ...current, [f.name]: undefined })}
            className={
              current[f.name]
                ? "px-2 py-1 border border-white/10 text-outline hover:bg-white/5 label-caps"
                : "px-2 py-1 border border-primary/40 bg-primary/10 text-primary label-caps"
            }
          >
            ALL
          </Link>
          {f.options.map((opt) => (
            <Link
              key={opt}
              href={buildUrl(basePath, { ...current, [f.name]: opt })}
              className={
                current[f.name] === opt
                  ? "px-2 py-1 border border-primary/40 bg-primary/10 text-primary label-caps"
                  : "px-2 py-1 border border-white/10 text-outline hover:bg-white/5 hover:text-on-surface label-caps"
              }
            >
              {opt}
            </Link>
          ))}
        </div>
      ))}
      {searchField && (
        <form action={basePath} className="ml-auto flex items-center gap-2">
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
            className="bg-transparent border-0 border-b border-white/10 px-2 py-1 data-tabular text-on-surface placeholder:text-surface-bright focus:outline-none focus:border-primary/40 w-56"
          />
        </form>
      )}
      {anyActive && (
        <Link
          href={basePath}
          className="label-caps text-outline hover:text-primary"
        >
          CLEAR
        </Link>
      )}
    </div>
  );
}
