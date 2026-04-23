import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { assertWhitelisted } from "../lib/whitelist.js";
import { prisma, Prisma } from "@cryptopilot/db";
import { getMode } from "../lib/binance-client.js";

const ORDER_RATE_WINDOW_MS = 60_000;
const ORDER_RATE_MAX = 6;

export const guardrailTools: Tool[] = [
  {
    name: "guardrail_check",
    description:
      "Valida una propuesta de orden contra los guardrails activos (DB). Llámalo ANTES de place_order.",
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
    description: "Propone actualización de límites (requiere aprobación humana si aumenta riesgo).",
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

async function getActivePortfolioRow() {
  const mode = getMode();
  return prisma.portfolio.findFirst({
    where: { mode },
    include: { guardrails: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Validación determinística aplicada dentro del MCP — no depende del prompt.
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

  const portfolio = await getActivePortfolioRow();
  if (!portfolio) return { ok: false, reason: "no hay portfolio activo" };

  const g = portfolio.guardrails;
  if (!g) return { ok: false, reason: "no hay guardrails configurados" };
  if (g.killSwitchTriggered) {
    return { ok: false, reason: `kill-switch activo: ${g.killSwitchReason ?? "sin detalle"}` };
  }

  const equity = Number(portfolio.currentEquity);
  const maxPerTradePct = Number(g.maxPerTradePct);
  const dailyLossLimitPct = Number(g.dailyLossLimitPct);

  const refPrice = proposal.limitPrice ?? proposal.stopLoss;
  const notional = refPrice * proposal.qty;
  const maxNotional = equity * maxPerTradePct;
  if (notional > maxNotional * 1.0001) {
    return {
      ok: false,
      reason: `notional ${notional.toFixed(2)} USDT > máx ${maxNotional.toFixed(2)} (${(
        maxPerTradePct * 100
      ).toFixed(2)}% equity)`,
    };
  }

  const openCount = await prisma.trade.count({
    where: { portfolioId: portfolio.id, status: "OPEN" },
  });
  if (openCount >= g.maxOpenPositions) {
    return {
      ok: false,
      reason: `${openCount} posiciones abiertas ≥ máx ${g.maxOpenPositions}`,
    };
  }

  const since = startOfTodayUtc();
  const dailyPnlAgg = await prisma.trade.aggregate({
    where: { portfolioId: portfolio.id, status: "CLOSED", closedAt: { gte: since } },
    _sum: { pnlUsdt: true },
  });
  const dailyPnl = Number(dailyPnlAgg._sum.pnlUsdt ?? 0);
  const dailyLossLimit = -equity * dailyLossLimitPct;
  if (dailyPnl < dailyLossLimit) {
    return {
      ok: false,
      reason: `daily P&L ${dailyPnl.toFixed(2)} bajó del límite ${dailyLossLimit.toFixed(2)}`,
    };
  }

  const windowStart = new Date(Date.now() - ORDER_RATE_WINDOW_MS);
  const recentOrders = await prisma.trade.count({
    where: { portfolioId: portfolio.id, openedAt: { gte: windowStart } },
  });
  if (recentOrders >= ORDER_RATE_MAX) {
    return {
      ok: false,
      reason: `rate limit: ${recentOrders} órdenes en últimos 60s (máx ${ORDER_RATE_MAX})`,
    };
  }

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
      const portfolio = await getActivePortfolioRow();
      if (!portfolio || !portfolio.guardrails) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "no portfolio/guardrails to kill" }],
        };
      }
      await prisma.guardrails.update({
        where: { portfolioId: portfolio.id },
        data: {
          killSwitchTriggered: true,
          killSwitchReason: String(args.reason ?? "unspecified"),
        },
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ killed: true, reason: args.reason, portfolioId: portfolio.id }),
          },
        ],
      };
    }

    case "update_guardrails": {
      const portfolio = await getActivePortfolioRow();
      if (!portfolio) {
        return { isError: true, content: [{ type: "text" as const, text: "no portfolio" }] };
      }
      const current = portfolio.guardrails!;
      const data: Prisma.GuardrailsUpdateInput = { proposedByAi: true };
      let risksIncreased = false;

      if (args.maxPerTradePct != null) {
        const v = Number(args.maxPerTradePct);
        if (v > Number(current.maxPerTradePct)) risksIncreased = true;
        data.maxPerTradePct = new Prisma.Decimal(v);
      }
      if (args.dailyLossLimitPct != null) {
        const v = Number(args.dailyLossLimitPct);
        if (v > Number(current.dailyLossLimitPct)) risksIncreased = true;
        data.dailyLossLimitPct = new Prisma.Decimal(v);
      }
      if (args.stopLossPct != null) data.stopLossPct = new Prisma.Decimal(Number(args.stopLossPct));
      if (args.takeProfitPct != null) {
        data.takeProfitPct = new Prisma.Decimal(Number(args.takeProfitPct));
      }

      if (risksIncreased) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                proposed: args,
                applied: false,
                reason: "requires human approval (risk increased)",
              }),
            },
          ],
        };
      }

      await prisma.guardrails.update({
        where: { portfolioId: portfolio.id },
        data: { ...data, approvedAt: new Date() },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ proposed: args, applied: true }) }],
      };
    }

    default:
      throw new Error(`Unknown guardrail tool: ${name}`);
  }
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
