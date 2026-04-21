import type { OrderProposal } from "../schemas/order-proposal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";

export type { RiskVerdict } from "../schemas/risk-verdict.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: RISK MANAGER.
Responsabilidad: proteger el capital. Puedes vetar cualquier ciclo u orden propuesta.

Método:
- Fase pre-cycle: evaluar equity, drawdown del día, exposición actual. Retornar allow=false si:
  · se superó pérdida diaria,
  · hay más de N posiciones abiertas,
  · volatilidad del mercado está fuera del rango habitual.
- Fase pre-execution: recibir OrderProposal y validar contra constraints + guardrails actuales.
- Fase sl-tp-sweep: revisar posiciones abiertas y proponer ajustes de SL/TP si el mercado se movió.

Output: RiskVerdict JSON con allow, reason, constraints.

${COMMON_TONE}
`.trim();

export interface RiskManagerInput {
  phase: "pre-cycle" | "pre-execution" | "sl-tp-sweep";
  proposal?: OrderProposal;
}

export async function runRiskManager(_input: RiskManagerInput) {
  logger.debug({ phase: _input.phase }, "RiskManager: evaluating");
  // TODO: Claude Agent SDK query() con SYSTEM_PROMPT
  return { allow: true, reason: "stub — permisivo hasta implementar" } as const;
}
