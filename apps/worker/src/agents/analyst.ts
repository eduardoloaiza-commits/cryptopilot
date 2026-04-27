import { AnalystOutputSchema, type Signal } from "../schemas/signal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";
import { getRecentPerformance } from "../lib/recent-performance.js";
import type { SymbolSnapshot } from "../lib/prefilter.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: ANALISTA DE DATOS (spot, long-only).

Consulta las skills \`market-regime\` y \`technical-analysis\` antes de decidir — son
autoritativas sobre la metodología. El system prompt resume las reglas duras pero las
fórmulas y umbrales viven en las skills.

Herramientas MCP disponibles:
- get_ticker(symbol)
- get_klines(symbol, interval, limit)
- compute_indicators(symbol, interval) → RSI, EMA fast/slow, Bollinger, ATR
- analyze_volatility(symbol)

## Flujo obligatorio

1. Régimen: compute_indicators("BTCUSDT", "1h") y compute_indicators("BTCUSDT", "4h").
   Clasifica en Bullish / Rangebound / Bearish / Overextended (ver skill market-regime).
2. Si Bearish u Overextended → retorna [] INMEDIATAMENTE. Stand aside. No explores los
   candidatos.
3. Si Bullish o Rangebound, SOLO para los símbolos del userPrompt "candidates" (top-K
   del prefilter — no escanees otros pares):
   - compute_indicators(symbol, "1h") — contexto
   - compute_indicators(symbol, "15m") — momentum
   - compute_indicators(symbol, "5m") — timing
   - get_ticker(symbol)
4. Aplica criterios de descarte (technical-analysis). Cualquier descarte → fuera.
5. Calcula confidence según la fórmula de la skill. Solo emite si confidence ≥ 0.65.
6. Para las señales que quedan, calcula suggestedSL = entryPrice − 1.5×ATR5m,
   suggestedTP = entryPrice + 3.0×ATR5m. Distancia SL ∈ [0.3%, 2%] del precio.
7. Máximo 3 señales ranked por confidence desc.

## Reglas duras del output

- Cada señal: direction es LITERALMENTE "LONG" (NUNCA "SHORT").
- suggestedSL y suggestedTP son obligatorios en cada señal.
- El rationale DEBE empezar con: "Régimen: {tipo} (BTC {evidencia}). {n}/3 TF alineados: ..."
- Si ninguna señal cumple threshold, signals: [] — NO fuerces una señal débil.

## Output JSON estricto (siempre los 4 campos, incluso si signals=[])

\`\`\`
{
  "regime": "Bullish" | "Rangebound" | "Bearish" | "Overextended" | "Unknown",
  "regimeReason": "Texto corto explicando BTC: RSI/EMA/contexto que clasificó el régimen. Obligatorio.",
  "rejected": [
    { "symbol": "XYZUSDT", "reason": "razón concreta del descarte (RSI > 80, momentum 5m débil, body < 60% ATR, etc.)" }
  ],
  "signals": [
    { symbol, direction: "LONG", confidence ≥ 0.65, rationale, indicators, suggestedSL, suggestedTP, generatedAt }
  ]
}
\`\`\`

CRÍTICO: \`regime\` y \`regimeReason\` son OBLIGATORIOS en CADA respuesta. Si retornas
signals=[], debes explicar EN \`regimeReason\` por qué (ej. "BTC RSI 1h 22, EMA9<EMA21,
oversold persistente — bearish, stand aside") y/o llenar \`rejected\` con cada candidato
descartado y su motivo. NO devuelvas signals=[] sin regimeReason poblado — eso nos
dejaría a ciegas sobre qué pensaste.

${COMMON_TONE}
`.trim();

const ALLOWED_TOOLS = ["get_ticker", "get_klines", "compute_indicators", "analyze_volatility"];

export interface AnalystInput {
  candidates: string[];
  prefilterSnapshots?: SymbolSnapshot[];
}

export async function runAnalyst(input: AnalystInput): Promise<Signal[]> {
  logger.debug({ candidates: input.candidates }, "analyst.start");
  const portfolio = await getActivePortfolio();
  const recent = await getRecentPerformance(10);

  if (input.candidates.length === 0) {
    return [];
  }

  const snapshotLines = (input.prefilterSnapshots ?? [])
    .map(
      (s) =>
        `  - ${s.symbol}: score=${s.score.toFixed(2)}, range=${s.rangePct.toFixed(2)}%, RSI5m=${s.rsi14.toFixed(1)}, body/ATR=${s.lastBodyPctOfAtr.toFixed(0)}%, volZ=${s.volumeZ.toFixed(1)}, chg24h=${s.priceChangePct24h.toFixed(2)}%`,
    )
    .join("\n");

  const userPrompt = `
## candidates (top-K del prefilter TS, ordenados por score)
${input.candidates.join(", ")}

${snapshotLines ? `## prefilter snapshots\n${snapshotLines}\n` : ""}

## recentPerformance (histórico reciente del portfolio)
${recent.summary}

- winrate últimos N: ${(recent.winrate * 100).toFixed(0)}%
- avg winner: $${recent.avgWinnerUsdt.toFixed(3)}
- avg loser: $${recent.avgLoserUsdt.toFixed(3)}
- posiciones abiertas ahora: ${recent.openCount}
- P&L del día: $${recent.dailyPnlUsdt.toFixed(3)}
- lostSymbols (aplica penalización −0.15 a confidence): ${recent.lostSymbols.length ? recent.lostSymbols.join(", ") : "ninguno"}
- wonSymbols: ${recent.wonSymbols.length ? recent.wonSymbols.join(", ") : "ninguno"}

## Tarea
Aplica el flujo obligatorio (régimen BTC → multi-TF por cada candidato → confidence ≥ 0.65).
No analices símbolos fuera de \`candidates\`. Devuelve el JSON enriquecido con regime,
regimeReason, rejected y signals (signals puede ser [] si el régimen o los criterios no
se cumplen, pero regime y regimeReason siempre son obligatorios).
`.trim();

  const result = await runAgent({
    role: "ANALYST",
    phase: "SCAN",
    systemPrompt: [SYSTEM_PROMPT],
    userPrompt,
    model: process.env.MODEL_ANALYST ?? "gpt-4.1-mini",
    allowedTools: ALLOWED_TOOLS,
    outputSchema: AnalystOutputSchema,
    maxTurns: 30,
    portfolioId: portfolio?.id ?? null,
  });

  if (!result.ok) {
    logger.warn({ reason: result.reason }, "analyst.failed");
    return [];
  }

  const { regime, regimeReason, rejected, signals } = result.data;
  logger.info(
    {
      regime,
      regimeReason: regimeReason.slice(0, 200),
      rejectedCount: rejected?.length ?? 0,
      rejectedSample: rejected?.slice(0, 3) ?? [],
      signalsCount: signals.length,
      costUsd: result.costUsd,
      ms: result.durationMs,
      candidates: input.candidates.length,
    },
    "analyst.done",
  );
  return signals;
}
