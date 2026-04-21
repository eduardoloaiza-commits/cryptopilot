import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getBinanceClient, getMode } from "../lib/binance-client.js";
import { assertWhitelisted } from "../lib/whitelist.js";
import { validateOrderAgainstGuardrails } from "./guardrails.js";

export const tradingTools: Tool[] = [
  {
    name: "place_order",
    description:
      "Coloca una orden spot. En modo PAPER simula el fill; en TESTNET/LIVE envía a Binance. SIEMPRE requiere stopLoss.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["BUY", "SELL"] },
        type: { type: "string", enum: ["MARKET", "LIMIT"] },
        qty: { type: "number" },
        limitPrice: { type: "number" },
        stopLoss: { type: "number" },
        takeProfit: { type: "number" },
      },
      required: ["symbol", "side", "type", "qty", "stopLoss"],
    },
  },
  {
    name: "cancel_order",
    description: "Cancela una orden abierta por orderId.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        orderId: { type: "string" },
      },
      required: ["symbol", "orderId"],
    },
  },
  {
    name: "get_open_orders",
    description: "Lista órdenes abiertas (opcional por símbolo).",
    inputSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
    },
  },
];

export async function handleTradingTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "place_order":
      return placeOrder(args);
    case "cancel_order":
      return cancelOrder(args);
    case "get_open_orders":
      return getOpenOrders(args);
    default:
      throw new Error(`Unknown trading tool: ${name}`);
  }
}

async function placeOrder(args: Record<string, unknown>) {
  const symbol = String(args.symbol);
  assertWhitelisted(symbol);

  const proposal = {
    symbol,
    side: args.side as "BUY" | "SELL",
    type: args.type as "MARKET" | "LIMIT",
    qty: Number(args.qty),
    limitPrice: args.limitPrice != null ? Number(args.limitPrice) : undefined,
    stopLoss: Number(args.stopLoss),
    takeProfit: args.takeProfit != null ? Number(args.takeProfit) : undefined,
  };

  const verdict = await validateOrderAgainstGuardrails(proposal);
  if (!verdict.ok) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Guardrail rejected: ${verdict.reason}` }],
    };
  }

  const mode = getMode();
  if (mode === "PAPER") {
    // TODO: simular fill usando ticker actual + slippage, persistir Trade en DB.
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ mode, stub: true, ...proposal, orderId: `paper_${Date.now()}` }),
        },
      ],
    };
  }

  const client = getBinanceClient();
  const res = await client.newOrder(
    symbol,
    proposal.side as never,
    proposal.type as never,
    {
      quantity: proposal.qty,
      ...(proposal.type === "LIMIT" ? { price: proposal.limitPrice, timeInForce: "GTC" as never } : {}),
    },
  );
  // TODO: crear OCO con SL/TP inmediatamente después (Binance spot: ocoOrder).
  return { content: [{ type: "text" as const, text: JSON.stringify(res) }] };
}

async function cancelOrder(args: Record<string, unknown>) {
  const symbol = String(args.symbol);
  assertWhitelisted(symbol);
  const client = getBinanceClient();
  const res = await client.cancelOrder(symbol, { orderId: Number(args.orderId) });
  return { content: [{ type: "text" as const, text: JSON.stringify(res) }] };
}

async function getOpenOrders(args: Record<string, unknown>) {
  const client = getBinanceClient();
  const symbol = args.symbol ? String(args.symbol) : undefined;
  if (symbol) assertWhitelisted(symbol);
  const res = await client.currentOpenOrders({ symbol });
  return { content: [{ type: "text" as const, text: JSON.stringify(res) }] };
}
