import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { assertWhitelisted } from "../lib/whitelist.js";

export const guardrailTools: Tool[] = [
  {
    name: "guardrail_check",
    description:
      "Valida una propuesta de orden contra los guardrails activos. Llámalo ANTES de place_order.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["BUY", "SELL"] },
        qty: { type: "number" },
        limitPrice: { type: "number" },
        stopLoss: { type: "number" },
        takeProfit: { type: "number" },
      },
      required: ["symbol", "side", "qty", "stopLoss"],
    },
  },
  {
    name: "kill_switch",
    description: "Activa el kill-switch: detiene el loop hasta intervención manual.",
    inputSchema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
  {
    name: "update_guardrails",
    description: "Propone actualización de límites (requiere aprobación humana si es aumento).",
    inputSchema: {
      type: "object",
      properties: {
        maxPerTradePct: { type: "number" },
        stopLossPct: { type: "number" },
        takeProfitPct: { type: "number" },
        dailyLossLimitPct: { type: "number" },
        rationale: { type: "string" },
      },
      required: ["rationale"],
    },
  },
];

export interface OrderProposal {
  symbol: string;
  side: "BUY" | "SELL";
  type?: "MARKET" | "LIMIT";
  qty: number;
  limitPrice?: number;
  stopLoss: number;
  takeProfit?: number;
}

export interface GuardrailVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Validación determinística aplicada dentro del MCP — no depende del prompt.
 * Se invoca desde `place_order` (en trading.ts) Y también expuesta como tool
 * para que el agente la consulte antes de proponer.
 */
export async function validateOrderAgainstGuardrails(
  proposal: OrderProposal,
): Promise<GuardrailVerdict> {
  try {
    assertWhitelisted(proposal.symbol);
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  if (!proposal.stopLoss || proposal.stopLoss <= 0) {
    return { ok: false, reason: "stopLoss obligatorio y positivo" };
  }

  if (proposal.qty <= 0) {
    return { ok: false, reason: "qty debe ser positiva" };
  }

  // TODO: consultar DB Guardrails activos:
  //  - notional <= equity * maxPerTradePct
  //  - SL distance >= minStopDistancePct
  //  - dailyPnl > -equity * dailyLossLimitPct
  //  - openPositions < maxOpenPositions
  //  - rate limit de órdenes/min

  return { ok: true };
}

export async function handleGuardrailTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "guardrail_check": {
      const verdict = await validateOrderAgainstGuardrails({
        symbol: String(args.symbol),
        side: args.side as "BUY" | "SELL",
        qty: Number(args.qty),
        stopLoss: Number(args.stopLoss),
        limitPrice: args.limitPrice != null ? Number(args.limitPrice) : undefined,
        takeProfit: args.takeProfit != null ? Number(args.takeProfit) : undefined,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(verdict) }] };
    }
    case "kill_switch": {
      // TODO: setear Guardrails.killSwitchTriggered = true en DB
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ killed: true, reason: args.reason }) },
        ],
      };
    }
    case "update_guardrails": {
      // TODO: upsert Guardrails, marcar proposedByAi=true si aumenta riesgo (pending approval)
      return { content: [{ type: "text" as const, text: JSON.stringify({ proposed: args }) }] };
    }
    default:
      throw new Error(`Unknown guardrail tool: ${name}`);
  }
}
