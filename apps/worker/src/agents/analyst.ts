import { SignalsArraySchema, type Signal } from "../schemas/signal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";
import { getRecentPerformance } from "../lib/recent-performance.js";

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
   otros pares.
3. Si Bullish o Rangebound, para cada símbolo del whitelist:
   - compute_indicators(symbol, "1h") — contexto
   - compute_indicators(symbol, "15m") — momentum
   - compute_indicators(symbol, "5m") — timing
   - get_ticker(symbol)
4. Aplica criterios de descarte (technical-analysis). Cualquier descarte → fuera.
5. Calcula confidence según la fórmula de la skill. Solo emite si confidence ≥ 0.65.
6. Para las señales que quedan, calcula suggestedSL = entryPrice − 1.5×ATR5m,
   suggestedTP = entryPrice + 3.0×ATR5m. Asegúrate de que la distancia del SL ∈ [0.3%, 2%]
   del precio.
7. Máximo 3 señales ranked por confidence desc.

## Reglas duras del output

- Cada señal: direction es LITERALMENTE "LONG" (NUNCA "SHORT").
- suggestedSL y suggestedTP son obligatorios en cada señal.
- El rationale DEBE empezar con: "Régimen: {tipo} (BTC {evidencia}). {n}/3 TF alineados: ..."
- Si ninguna señal cumple threshold, retorna [] — NO fuerces una señal débil.

Output: JSON array estricto matcheando el schema Signal:
{ symbol, direction: "LONG", confidence ≥ 0.65, rationale, indicators, suggestedSL, suggestedTP, generatedAt }

${COMMON_TONE}
`.trim();

const ALLOWED_TOOLS = ["get_ticker", "get_klines", "compute_indicators", "analyze_volatility"];

export async function runAnalyst(): Promise<Signal[]> {
  logger.debug("analyst.start");
  const portfolio = await getActivePortfolio();
  const recent = await getRecentPerformance(10);

  const userPrompt = `
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
Aplica el flujo obligatorio (régimen BTC → multi-TF por símbolo → confidence ≥ 0.65).
Devuelve el array JSON de señales (puede ser [] si el régimen o los criterios no se cumplen).
`.trim();

  const result = await runAgent({
    role: "ANALYST",
    phase: "SCAN",
    systemPrompt: [SYSTEM_PROMPT],
    userPrompt,
    model: process.env.MODEL_ANALYST ?? "claude-sonnet-4-6",
    allowedTools: ALLOWED_TOOLS,
    outputSchema: SignalsArraySchema,
    maxTurns: 30,
    portfolioId: portfolio?.id ?? null,
  });

  if (!result.ok) {
    logger.warn({ reason: result.reason }, "analyst.failed");
    return [];
  }

  logger.info(
    { count: result.data.length, costUsd: result.costUsd, ms: result.durationMs },
    "analyst.done",
  );
  return result.data;
}
