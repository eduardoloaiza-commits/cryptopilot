import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getBinanceClient } from "../lib/binance-client.js";
import { assertWhitelisted } from "../lib/whitelist.js";

export const marketTools: Tool[] = [
  {
    name: "get_ticker",
    description: "Precio actual del símbolo (bid/ask/last). Siempre llámalo antes de decidir una orden.",
    inputSchema: {
      type: "object",
      properties: { symbol: { type: "string", description: "Ej. BTCUSDT" } },
      required: ["symbol"],
    },
  },
  {
    name: "get_klines",
    description: "Velas OHLCV recientes para un timeframe.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        interval: { type: "string", enum: ["1m", "5m", "15m", "1h", "4h", "1d"] },
        limit: { type: "number", default: 100 },
      },
      required: ["symbol", "interval"],
    },
  },
  {
    name: "analyze_volatility",
    description: "Calcula ATR y stddev sobre 30d para proponer guardrails iniciales.",
    inputSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
    },
  },
  {
    name: "compute_indicators",
    description: "Computa RSI, EMA fast/slow, Bollinger y ATR sobre los klines recientes.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        interval: { type: "string", enum: ["1m", "5m", "15m", "1h"] },
      },
      required: ["symbol", "interval"],
    },
  },
];

export async function handleMarketTool(name: string, args: Record<string, unknown>) {
  const symbol = String(args.symbol);
  assertWhitelisted(symbol);
  const client = getBinanceClient();

  switch (name) {
    case "get_ticker": {
      const data = await client.symbolPriceTicker({ symbol });
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
    }
    case "get_klines": {
      const interval = String(args.interval);
      const limit = Number(args.limit ?? 100);
      const data = await client.klineCandlestickData(symbol, interval as never, { limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
    }
    case "analyze_volatility": {
      // TODO: implementar ATR/stddev sobre klines 1d limit=30
      return { content: [{ type: "text" as const, text: JSON.stringify({ stub: true, symbol }) }] };
    }
    case "compute_indicators": {
      // TODO: RSI, EMA, BB, ATR — usar technicalindicators o implementación propia
      return { content: [{ type: "text" as const, text: JSON.stringify({ stub: true, symbol }) }] };
    }
    default:
      throw new Error(`Unknown market tool: ${name}`);
  }
}
