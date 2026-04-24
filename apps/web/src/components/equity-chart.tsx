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
      <div className="p-8 text-center">
        <h3 className="label-caps text-on-surface mb-2">EQUITY CURVE</h3>
        <p className="text-[13px] text-outline">
          Aún no hay snapshots suficientes — el worker los registra cada ciclo.
        </p>
      </div>
    );
  }

  const min = Math.min(...data.map((d) => d.equity));
  const max = Math.max(...data.map((d) => d.equity));
  const pad = (max - min) * 0.1 || 1;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="label-caps text-on-surface">EQUITY CURVE (7D)</h3>
        <div className="flex gap-4 font-mono text-[10px] text-outline uppercase">
          <span>H: ${max.toFixed(2)}</span>
          <span>L: ${min.toFixed(2)}</span>
          <span>N: {data.length}</span>
        </div>
      </div>
      <div className="flex-1 min-h-[280px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5af0b3" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5af0b3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
            <XAxis
              dataKey="ts"
              tick={{ fill: "#85948b", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
              }}
              minTickGap={60}
              stroke="#3c4a42"
            />
            <YAxis
              tick={{ fill: "#85948b", fontSize: 10, fontFamily: "JetBrains Mono" }}
              domain={[min - pad, max + pad]}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={60}
              stroke="#3c4a42"
            />
            <Tooltip
              contentStyle={{
                background: "#0e1511",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
                borderRadius: 0,
              }}
              labelStyle={{ color: "#85948b", fontSize: 10, textTransform: "uppercase" }}
              labelFormatter={(v) => new Date(v as string).toLocaleString("es-CL")}
              formatter={(v: number, name) =>
                name === "equity" ? [`$${v.toFixed(2)}`, "EQUITY"] : [v, String(name).toUpperCase()]
              }
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#5af0b3"
              strokeWidth={1.5}
              fill="url(#equityGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
