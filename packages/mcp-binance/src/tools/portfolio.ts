import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getBinanceClient } from "../lib/binance-client.js";

export const portfolioTools: Tool[] = [
  {
    name: "list_balances",
    description: "Balances spot (USDT + cripto mantenidos).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_trade_history",
    description: "Historial de trades ejecutados por símbolo.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        limit: { type: "number", default: 50 },
      },
      required: ["symbol"],
    },
  },
  {
    name: "calculate_pnl",
    description: "P&L realizado del día (por defecto) o rango dado.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO datetime" },
        to: { type: "string", description: "ISO datetime" },
      },
    },
  },
];

export async function handlePortfolioTool(name: string, args: Record<string, unknown>) {
  const client = getBinanceClient();
  switch (name) {
    case "list_balances": {
      const account = await client.accountInformation();
      const balances = (account.balances ?? []).filter(
        (b) => Number(b.free) + Number(b.locked) > 0,
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(balances) }] };
    }
    case "get_trade_history": {
      const symbol = String(args.symbol);
      const limit = Number(args.limit ?? 50);
      const trades = await client.accountTradeList(symbol, { limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(trades) }] };
    }
    case "calculate_pnl": {
      // TODO: leer Trades cerrados en rango desde la DB, sumar pnlUsdt
      return { content: [{ type: "text" as const, text: JSON.stringify({ stub: true }) }] };
    }
    default:
      throw new Error(`Unknown portfolio tool: ${name}`);
  }
}
