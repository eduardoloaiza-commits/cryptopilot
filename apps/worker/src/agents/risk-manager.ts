import type { OrderProposal } from "../schemas/order-proposal.js";
import { RiskVerdictSchema, type RiskVerdict } from "../schemas/risk-verdict.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";

export type { RiskVerdict } from "../schemas/risk-verdict.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: RISK MANAGER.
Responsabilidad: proteger el capital. Puedes vetar cualquier ciclo u orden propuesta.

Herramientas disponibles (MCP):
- list_balances() — equity actual + posiciones abiertas
- calculate_pnl() — P&L del día
- get_open_positions()
- guardrail_check(proposal)

Fases:
- pre-cycle: evalúa si se debe SKIP este ciclo. Retorna allow=false si:
    · pérdida diaria > límite
    · >=3 posiciones abiertas
    · volatilidad/condiciones extremas
  Si allow=true, incluye constraints { maxPositionUsdt, openPositionsCount, remainingDailyLossBudgetUsdt }.
- pre-execution: recibe OrderProposal y llama guardrail_check; si falla, allow=false.
- sl-tp-sweep: revisa posiciones abiertas (get_open_positions) y propone ajustes (solo informativo).

Output: RiskVerdict JSON: { allow: boolean, reason: string, constraints?: { maxPositionUsdt?, remainingDailyLossBudgetUsdt?, openPositionsCount? } }.

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

  const result = await runAgent({
    role: "RISK_MANAGER",
    phase: input.phase === "sl-tp-sweep" ? "SWEEP" : input.phase === "pre-cycle" ? "SCAN" : "DECIDE",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    model: process.env.MODEL_RISK ?? "claude-sonnet-4-6",
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
