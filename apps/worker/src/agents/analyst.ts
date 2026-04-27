import { AnalystOutputSchema, type Signal } from "../schemas/signal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";
import { getRecentPerformance } from "../lib/recent-performance.js";
import type { SymbolSnapshot } from "../lib/prefilter.js";
import { getUniverse } from "@cryptopilot/shared";

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
2. Si **Overextended** → retorna signals=[] INMEDIATAMENTE. BTC sobreextendida = corrección
   probable, no operar. (Bearish ya NO es stand-aside automático — ver paso 4.)
3. Para los símbolos en \`candidates\` (top-K del prefilter — no escanees otros pares):
   - compute_indicators(symbol, "1h") — contexto
   - compute_indicators(symbol, "15m") — momentum
   - compute_indicators(symbol, "5m") — timing
   - get_klines(symbol, "4h", limit=20) — backdrop 4h para Horizon Coherence (paso 5)
   - get_ticker(symbol)
4. **Filtro Relative-Strength (solo régimen Bearish)** — descarta inmediatamente cualquier
   candidato que NO cumpla TODAS:
     - priceChange24h del candidato > 0% (no cae en absoluto)
     - priceChange24h(candidato) − priceChange24h(BTC) ≥ +5% (decoupled, outperformeando)
     - volZ del prefilter > 1.0 (volumen confirma narrativa, no es flush)
     - RSI 1h fuera de [70, 85] (no entrar en overbought local extremo)
   En Rangebound y Bullish, NO aplica este filtro — todos los candidatos siguen al paso 5.
5. **Horizon Coherence Check (HC) — OBLIGATORIO antes de emitir CUALQUIER señal**.
   Validá las 4 condiciones; cualquiera que falle → descartá el símbolo con razón explícita.
     a) **Last 4h direction**: con get_klines 4h (~5 candles cubren 20h, mirá las últimas 1-2),
        el cierre de hace ~4h (close del kline 4h previo) DEBE ser ≤ entryPrice actual O la
        vela 4h actual tiene close > open (martillo o cuerpo verde). Caída neta de ≥1%
        sobre las últimas 4h SIN reversión visible en 5m → INCONGRUENTE, descartá.
     b) **Projection room**: distancia desde entryPrice hasta el techo más cercano (4h high
        de las últimas 12 candles, o BB upper 1h, lo que esté más cerca) DEBE ser ≥
        suggestedTP − entryPrice. Si el TP cae más allá del techo natural, no hay espacio.
     c) **Volume confirm**: el volumen del último kline 5m DEBE ser ≥ 1.0× la media de los
        últimos 12 klines 5m. Volumen débil = falta de convicción, INCONGRUENTE.
     d) **No-conflict**: NINGUNO de estos puede ser cierto:
        - 4h RSI cruzando hacia abajo desde > 70 en la última vela
        - 1h MACD recién negativo (signal cross dentro de las últimas 3 velas) — si computás
        - 15m EMA9 < EMA21 al mismo tiempo que 5m está bajando (downtrend confluyente)
6. Calculá confidence según skill. Threshold dinámico por régimen:
     - Bullish: confidence ≥ 0.65
     - Rangebound: confidence ≥ 0.70
     - Bearish: confidence ≥ 0.75 (filtro RS + HC + más alto)
7. Para las señales que sobreviven HC + threshold, calculá:
     - suggestedSL = entryPrice − 1.5×ATR5m (distancia ∈ [0.3%, 2%])
     - suggestedTP = entryPrice + 3.0×ATR5m
   Y aplicá size cap por régimen (informativo en rationale, el RiskManager lo enforza):
     - Bullish: 100% de maxPerTradePct
     - Rangebound: 80%
     - Bearish: 50%
8. Máximo 3 señales ranked por confidence desc.

## Reglas duras del output

- Cada señal: direction es LITERALMENTE "LONG" (NUNCA "SHORT").
- suggestedSL y suggestedTP son obligatorios en cada señal.
- El rationale DEBE empezar con: "Régimen: {tipo} (BTC {evidencia}). HC: a✓ b✓ c✓ d✓.
  {n}/3 TF alineados: ..." (incluí explícitamente cómo pasaste cada subcheck HC).
- Si ninguna señal pasa HC + threshold, signals: [] — NO fuerces. La doctrina dice:
  perder oportunidades es BARATO, perder capital es CARO.

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

  // BTC priceChange24h — necesario para el filtro Relative-Strength en régimen Bearish.
  // El universo está cacheado en memoria, así que esta llamada es barata.
  let btcChange24h: number | null = null;
  try {
    const universe = await getUniverse();
    const btc = universe.find((u) => u.symbol === "BTCUSDT");
    btcChange24h = btc?.priceChangePct ?? null;
  } catch (err) {
    logger.debug({ err }, "analyst.btc-context.failed");
  }

  const userPrompt = `
## candidates (top-K del prefilter TS, ordenados por score)
${input.candidates.join(", ")}

${snapshotLines ? `## prefilter snapshots\n${snapshotLines}\n` : ""}

## BTC contexto (anchor del régimen + base del filtro Relative-Strength)
- BTCUSDT priceChange24h: ${btcChange24h != null ? btcChange24h.toFixed(2) + "%" : "n/a"}
- En régimen Bearish, un candidato pasa el filtro RS solo si su chg24h supera al de BTC en ≥ 5pp.


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
