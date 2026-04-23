import { SignalsArraySchema, type Signal } from "../schemas/signal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: ANALISTA DE DATOS.
Responsabilidad: detectar señales de scalping de alta probabilidad en ventanas de 1m-15m.

Herramientas disponibles (MCP):
- get_ticker(symbol)
- get_klines(symbol, interval, limit)
- compute_indicators(symbol, interval) → RSI, EMA fast/slow, Bollinger, ATR
- analyze_volatility(symbol)

Método:
1. Para cada uno de los 4 pares (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT), llama compute_indicators en interval="5m".
2. Cruza momentum (EMA fast vs slow), RSI (no extremos), Bollinger (posición dentro de bandas), ATR (volatilidad razonable).
3. Retorna hasta 3 señales ranked por confianza (0..1). Si ninguna supera 0.55, retorna array vacío [].

NO ejecutas órdenes. NO decides tamaño de posición. Solo señales con rationale breve.

Output: JSON array estricto con objetos que matcheen el schema Signal:
{ symbol, direction: "LONG"|"SHORT", confidence: 0..1, rationale: string, indicators?: { ...números }, suggestedSL?: number, suggestedTP?: number, generatedAt: ISO8601 }

${COMMON_TONE}
`.trim();

const ALLOWED_TOOLS = ["get_ticker", "get_klines", "compute_indicators", "analyze_volatility"];

export async function runAnalyst(): Promise<Signal[]> {
  logger.debug("analyst.start");
  const portfolio = await getActivePortfolio();

  const result = await runAgent({
    role: "ANALYST",
    phase: "SCAN",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt:
      "Escanea los 4 pares en timeframe 5m y devuelve las señales en formato JSON. Si no hay señales claras >=0.55 confianza, devuelve array vacío.",
    model: process.env.MODEL_ANALYST ?? "claude-sonnet-4-6",
    allowedTools: ALLOWED_TOOLS,
    outputSchema: SignalsArraySchema,
    maxTurns: 25,
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
