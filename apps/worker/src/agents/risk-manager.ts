import type { OrderProposal } from "../schemas/order-proposal.js";
import { RiskVerdictSchema, type RiskVerdict } from "../schemas/risk-verdict.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";

export type { RiskVerdict } from "../schemas/risk-verdict.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: RISK MANAGER (spot, long-only, conservador).
Tu palabra es final: puedes vetar cualquier ciclo u orden.

Herramientas MCP:
- list_balances() — equity + posiciones abiertas
- calculate_pnl() — P&L del día
- get_open_positions()
- guardrail_check(proposal)

## Fase pre-cycle
Evalúa si se permite escanear señales. Retorna allow=false si:
- pérdida diaria ≥ 50% del límite (early stop, no esperar a 100%)
- ≥3 posiciones abiertas (límite duro)
- racha perdedora ≥3 trades consecutivos ese día → freno de emergencia
- volatilidad BTC anómala (ATR 1h > 3× su media 30d)

Si allow=true: constraints { maxPositionUsdt, openPositionsCount, remainingDailyLossBudgetUsdt }.

## Fase pre-execution
Recibes OrderProposal. Veta si cualquiera de:
- side ≠ "BUY" (spot no permite shorts — VETO ABSOLUTO).
- coherencia rota: NO se cumple stopLoss < entryPrice < takeProfit.
- distancia SL fuera de [0.3%, 2%] del entryPrice.
- R:R (TP−entry) / (entry−SL) < 1.5 — ratio insuficiente.
- notional > maxPositionUsdt.
- guardrail_check rechaza.

## Fase sl-tp-sweep
Informativa. Retorna allow=true siempre.

Output: RiskVerdict JSON: { allow, reason, constraints? }.
Si disparas kill-switch (pérdida diaria > límite), llama kill_switch(reason) y allow=false.

Doctrina: ante duda, veto. No cedas a presión del analyst/trader. El capital vale más que un trade.

${COMMON_TONE}
`.trim();

const ALLOWED_TOOLS = [
  "list_balances",
  "calculate_pnl",
  "get_open_positions",
  "guardrail_check",
];

export interface RiskManagerInput {
  phase: "pre-cycle" | "pre-execution" | "sl-tp-sweep";
  proposal?: OrderProposal;
}

export async function runRiskManager(input: RiskManagerInput): Promise<RiskVerdict> {
  logger.debug({ phase: input.phase }, "risk.start");
  const portfolio = await getActivePortfolio();

  const userPrompt =
    input.phase === "pre-cycle"
      ? "Fase pre-cycle. Evalúa salud global antes de escanear señales. Devuelve RiskVerdict JSON."
      : input.phase === "pre-execution"
        ? `Fase pre-execution. Valida esta propuesta:\n${JSON.stringify(
            input.proposal,
            null,
            2,
          )}\nDevuelve RiskVerdict JSON.`
        : "Fase sl-tp-sweep. Revisa posiciones abiertas y devuelve RiskVerdict (allow=true informativo).";

  // pre-cycle es casi determinista (contar posiciones, chequear DD diario) —
  // gpt-4.1-nano lo resuelve bien por ~20% del costo de mini. pre-execution
  // valida la propuesta específica (side, R:R, SL en rango) — también razonable
  // para nano. sl-tp-sweep se mantiene con mini como respaldo informativo.
  const defaultModel =
    input.phase === "sl-tp-sweep" ? "gpt-4.1-mini" : "gpt-4.1-nano";
  const modelEnv =
    input.phase === "pre-cycle"
      ? process.env.MODEL_RISK_PRECYCLE
      : input.phase === "pre-execution"
        ? process.env.MODEL_RISK_EXEC
        : process.env.MODEL_RISK;

  const result = await runAgent({
    role: "RISK_MANAGER",
    phase: input.phase === "sl-tp-sweep" ? "SWEEP" : input.phase === "pre-cycle" ? "SCAN" : "DECIDE",
    systemPrompt: [SYSTEM_PROMPT],
    userPrompt,
    model: modelEnv ?? process.env.MODEL_RISK ?? defaultModel,
    allowedTools: ALLOWED_TOOLS,
    outputSchema: RiskVerdictSchema,
    maxTurns: 15,
    portfolioId: portfolio?.id ?? null,
  });

  if (!result.ok) {
    logger.warn({ reason: result.reason, phase: input.phase }, "risk.failed");
    return { allow: false, reason: `risk-manager SDK error: ${result.reason}` };
  }
  logger.info(
    { allow: result.data.allow, reason: result.data.reason, costUsd: result.costUsd },
    "risk.verdict",
  );
  return result.data;
}
