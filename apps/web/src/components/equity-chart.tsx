"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  ts: string;
  equity: number;
  openCount: number;
}

export function EquityChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-white/10 p-8 text-sm text-[color:var(--muted)] text-center">
        Aún no hay suficientes snapshots de equity. El worker los registra cada ciclo.
      </div>
    );
  }

  const min = Math.min(...data.map((d) => d.equity));
  const max = Math.max(...data.map((d) => d.equity));
  const pad = (max - min) * 0.1 || 1;

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Equity — últimos 7 días</h2>
        <span className="text-xs text-[color:var(--muted)]">{data.length} puntos</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="ts"
              tick={{ fill: "#8b92a0", fontSize: 10 }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
              }}
              minTickGap={60}
            />
            <YAxis
              tick={{ fill: "#8b92a0", fontSize: 10 }}
              domain={[min - pad, max + pad]}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "#0b0d10",
                border: "1px solid #ffffff20",
                fontSize: 12,
              }}
              labelFormatter={(v) => new Date(v as string).toLocaleString("es-CL")}
              formatter={(v: number, name) =>
                name === "equity" ? [`$${v.toFixed(2)}`, "equity"] : [v, name]
              }
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#equityGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
