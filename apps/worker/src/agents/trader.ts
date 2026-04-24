import type { Signal } from "../schemas/signal.js";
import { OrderProposalSchema, type OrderProposal } from "../schemas/order-proposal.js";
import type { RiskVerdict } from "../schemas/risk-verdict.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";
import { z } from "zod";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: TRADER (spot, long-only).
Responsabilidad: transformar señales LONG del Analista en propuestas BUY concretas con SL/TP.

Herramientas MCP:
- get_ticker(symbol) — precio de referencia actual
- list_balances() — capital disponible y posiciones abiertas
- get_open_positions()
- guardrail_check(...) — valida la propuesta ANTES de devolverla

## Reglas duras
- SOLO BUY. Si una señal trae direction distinto de "LONG", la descartas con skipReason.
- Nunca uses side: "SELL" para abrir posición. SELL se reserva para cerrar LONGs (sweep auto).
- SL y TP vienen del Analista calculados con ATR multi-TF — úsalos SIN sobreescribir.
  Si la señal no trae suggestedSL/suggestedTP, descártala (no calcules tú valores default).

## Método
1. list_balances → equity USDT disponible, posiciones abiertas, maxPerTradePct.
2. Para la mejor señal (mayor confidence):
   a. get_ticker(symbol) → entryPrice de referencia.
   b. riskUsdt = equity × maxPerTradePct (p.ej. 2%).
   c. qty = riskUsdt / (entryPrice − suggestedSL).
   d. notional = qty × entryPrice. Si notional > maxPositionUsdt del risk manager, reduce qty.
   e. Llama guardrail_check. Si falla, pasa a la siguiente señal (máx 3 intentos).
3. Si ninguna señal pasa, proposal=null + skipReason.

Output JSON: { "proposal": OrderProposal | null, "skipReason"?: string }
Donde OrderProposal tiene side="BUY" literal, type="MARKET", SL y TP definidos.

${COMMON_TONE}
`.trim();

const ALLOWED_TOOLS = [
  "get_ticker",
  "list_balances",
  "get_open_positions",
  "guardrail_check",
];

const TraderOutputSchema = z.object({
  proposal: OrderProposalSchema.nullable(),
  skipReason: z.string().optional(),
});

export interface TraderInput {
  signals: Signal[];
  riskConstraints?: RiskVerdict["constraints"];
}

async function runTraderFn(input: TraderInput): Promise<OrderProposal | null> {
  logger.debug({ count: input.signals.length }, "trader.start");
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    logger.error("trader: no portfolio");
    return null;
  }

  const userPrompt = `
Señales recibidas del Analista (priorizadas por confianza):
${JSON.stringify(input.signals, null, 2)}

Restricciones del Risk Manager (si vienen):
${JSON.stringify(input.riskConstraints ?? {}, null, 2)}

Evalúa, valida con guardrail_check y devuelve UNA orden o null.
`.trim();

  const result = await runAgent({
    role: "TRADER",
    phase: "DECIDE",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    model: process.env.MODEL_TRADER ?? "claude-haiku-4-5-20251001",
    allowedTools: ALLOWED_TOOLS,
    outputSchema: TraderOutputSchema,
    maxTurns: 20,
    portfolioId: portfolio.id,
  });

  if (!result.ok) {
    logger.warn({ reason: result.reason }, "trader.failed");
    return null;
  }
  if (result.data.proposal === null) {
    logger.info(
      { skipReason: result.data.skipReason, costUsd: result.costUsd },
      "trader.no-proposal",
    );
    return null;
  }
  logger.info(
    { proposal: result.data.proposal, costUsd: result.costUsd, ms: result.durationMs },
    "trader.proposal",
  );
  return result.data.proposal;
}

const PaperFillSchema = z.object({
  orderId: z.string(),
  tradeId: z.string(),
  symbol: z.string(),
  side: z.enum(["BUY", "SELL"]),
  filledQty: z.number(),
  avgPrice: z.number(),
  feesUsdt: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number().nullable(),
  portfolioId: z.string(),
  openedAt: z.string(),
});
type PaperFill = z.infer<typeof PaperFillSchema>;

const ExecuteOutputSchema = z.object({
  fill: PaperFillSchema.nullable(),
  error: z.string().optional(),
});

async function executeFn(proposal: OrderProposal): Promise<PaperFill | null> {
  logger.info({ proposal }, "trader.execute.start");
  const portfolio = await getActivePortfolio();

  const userPrompt = `
Propuesta aprobada:
${JSON.stringify(proposal, null, 2)}

Ejecuta place_order con EXACTAMENTE estos parámetros (incluye rationale y sourceSignalId si lo tienes).
Luego devuelve el JSON de la respuesta de place_order tal cual.
`.trim();

  const EXECUTE_PROMPT = `
${MISSION_BRIEF}

Rol: TRADER (fase EXECUTE).
Tu única tarea es llamar place_order con los parámetros dados y devolver el objeto JSON de la respuesta.
NO modifiques qty, SL ni TP. NO evalúes la señal. Solo ejecuta y reporta.
Output JSON: { "fill": { orderId, tradeId, symbol, side, filledQty, avgPrice, feesUsdt, stopLoss, takeProfit, portfolioId, openedAt } | null, "error"?: string }.

${COMMON_TONE}
`.trim();

  const result = await runAgent({
    role: "TRADER",
    phase: "EXECUTE",
    systemPrompt: EXECUTE_PROMPT,
    userPrompt,
    model: process.env.MODEL_EXECUTE ?? "claude-haiku-4-5-20251001",
    allowedTools: ["place_order"],
    outputSchema: ExecuteOutputSchema,
    maxTurns: 5,
    portfolioId: portfolio?.id ?? null,
  });

  if (!result.ok) {
    logger.error({ reason: result.reason }, "trader.execute.failed");
    return null;
  }
  if (!result.data.fill) {
    logger.error({ error: result.data.error }, "trader.execute.no-fill");
    return null;
  }
  logger.info({ fill: result.data.fill, costUsd: result.costUsd }, "trader.execute.done");
  return result.data.fill;
}

export const runTrader = Object.assign(runTraderFn, { execute: executeFn });
