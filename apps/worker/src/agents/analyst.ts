import type { Signal } from "../schemas/signal.js";
import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: ANALISTA DE DATOS.
Responsabilidad: detectar señales de scalping de alta probabilidad en ventanas de 1m-15m.

Método:
1. Usa get_klines (1m, 5m, 15m) para los 4 pares.
2. Calcula indicadores con compute_indicators (RSI, EMA fast/slow, Bollinger, ATR).
3. Cruza: momentum + volatilidad contenida + no sobrecompra/sobreventa extrema.
4. Retorna hasta 3 señales ranked por confianza (0-1). Si ninguna supera 0.55, retorna array vacío.

NO ejecutas órdenes. NO decides tamaño de posición. Solo señales con rationale breve.

${COMMON_TONE}
`.trim();

export async function runAnalyst(): Promise<Signal[]> {
  logger.debug("Analyst: scanning markets");
  // TODO: invocar Claude Agent SDK query() con SYSTEM_PROMPT + allowedTools MCP
  // const result = await query({ model: "claude-sonnet-4-6", systemPrompt: SYSTEM_PROMPT, mcpServers: {...}, allowedTools: [...] });
  // return SignalsArraySchema.parse(result.finalOutput);
  return [];
}
