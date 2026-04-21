import type { Signal } from "../schemas/signal.js";
import type { OrderProposal } from "../schemas/order-proposal.js";
import type { RiskVerdict } from "../schemas/risk-verdict.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: TRADER.
Responsabilidad: transformar señales en propuestas de orden concretas (side, qty, SL, TP).

Método:
1. Recibes señales del Analista y restricciones del Risk Manager.
2. Usa list_balances para conocer capital disponible.
3. Aplica position sizing (skill position-sizing): volatility-based, máximo maxPositionUsdt.
4. SL obligatorio en cada propuesta; TP opcional pero recomendado.
5. Llama guardrail_check antes de retornar; si falla, NO propongas nada.

Output: una sola OrderProposal JSON, o null si nada supera el umbral.

${COMMON_TONE}
`.trim();

export interface TraderInput {
  signals: Signal[];
  riskConstraints?: RiskVerdict["constraints"];
}

async function runTraderFn(_input: TraderInput): Promise<OrderProposal | null> {
  logger.debug("Trader: evaluating signals");
  // TODO: Claude Agent SDK query() con SYSTEM_PROMPT
  return null;
}

async function executeFn(_proposal: OrderProposal) {
  logger.info({ proposal: _proposal }, "Trader: executing order");
  // TODO: tool call place_order via MCP
  return { orderId: "stub", filledQty: 0, avgPrice: 0 };
}

export const runTrader = Object.assign(runTraderFn, { execute: executeFn });
