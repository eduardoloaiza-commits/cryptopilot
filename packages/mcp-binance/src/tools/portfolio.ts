import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getBinanceClient, getMode } from "../lib/binance-client.js";
import { prisma } from "@cryptopilot/db";

export const portfolioTools: Tool[] = [
  {
    name: "list_balances",
    description:
      "En PAPER: equity + USDT libre + posiciones abiertas desde la DB. En TESTNET/LIVE: balances spot de Binance.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_trade_history",
    description: "Historial de trades del portfolio activo (últimos N, opcional por símbolo).",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "calculate_pnl",
    description: "P&L realizado por rango (default: hoy) y breakdown por símbolo.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO datetime (default: medianoche local)" },
        to: { type: "string", description: "ISO datetime (default: ahora)" },
      },
    },
  },
  {
    name: "get_open_positions",
    description: "Lista de posiciones abiertas en PAPER (desde DB) con precio de entrada, SL, TP.",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function handlePortfolioTool(name: string, args: Record<string, unknown>) {
  const mode = getMode();

  switch (name) {
    case "list_balances": {
      if (mode === "PAPER") {
        const portfolio = await prisma.portfolio.findFirst({
          where: { mode: "PAPER" },
          orderBy: { createdAt: "asc" },
        });
        if (!portfolio) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "no PAPER portfolio" }) }],
          };
        }
        const openTrades = await prisma.trade.findMany({
          where: { portfolioId: portfolio.id, status: "OPEN" },
          select: { id: true, symbol: true, side: true, qty: true, entryPrice: true },
        });
        const payload = {
          portfolioId: portfolio.id,
          mode: portfolio.mode,
          equityUsdt: Number(portfolio.currentEquity),
          initialCapitalUsdt: Number(portfolio.initialCapital),
          openPositions: openTrades.map((t) => ({
            tradeId: t.id,
            symbol: t.symbol,
            side: t.side,
            qty: Number(t.qty),
            entryPrice: Number(t.entryPrice),
          })),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
      }
      const client = getBinanceClient();
      const account = await client.accountInformation();
      const balances = (account.balances ?? []).filter(
        (b) => Number(b.free) + Number(b.locked) > 0,
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(balances) }] };
    }

    case "get_trade_history": {
      const symbol = args.symbol ? String(args.symbol) : undefined;
      const limit = Number(args.limit ?? 50);
      if (mode === "PAPER") {
        const portfolio = await prisma.portfolio.findFirst({
          where: { mode: "PAPER" },
          orderBy: { createdAt: "asc" },
        });
        if (!portfolio) {
          return { content: [{ type: "text" as const, text: JSON.stringify([]) }] };
        }
        const rows = await prisma.trade.findMany({
          where: { portfolioId: portfolio.id, ...(symbol ? { symbol } : {}) },
          orderBy: { openedAt: "desc" },
          take: limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                rows.map((t) => ({
                  id: t.id,
                  symbol: t.symbol,
                  side: t.side,
                  status: t.status,
                  qty: Number(t.qty),
                  entryPrice: Number(t.entryPrice),
                  exitPrice: t.exitPrice != null ? Number(t.exitPrice) : null,
                  stopLoss: Number(t.stopLoss),
                  takeProfit: t.takeProfit != null ? Number(t.takeProfit) : null,
                  pnlUsdt: t.pnlUsdt != null ? Number(t.pnlUsdt) : null,
                  openedAt: t.openedAt,
                  closedAt: t.closedAt,
                })),
              ),
            },
          ],
        };
      }
      if (!symbol) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "symbol required in TESTNET/LIVE" }],
        };
      }
      const client = getBinanceClient();
      const trades = await client.accountTradeList(symbol, { limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(trades) }] };
    }

    case "calculate_pnl": {
      const portfolio = await prisma.portfolio.findFirst({
        where: { mode: mode === "LIVE" ? "LIVE" : mode === "TESTNET" ? "TESTNET" : "PAPER" },
        orderBy: { createdAt: "asc" },
      });
      if (!portfolio) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "no portfolio" }) }] };
      }
      const from = args.from ? new Date(String(args.from)) : startOfTodayUtc();
      const to = args.to ? new Date(String(args.to)) : new Date();

      const closed = await prisma.trade.findMany({
        where: {
          portfolioId: portfolio.id,
          status: "CLOSED",
          closedAt: { gte: from, lte: to },
        },
        select: { symbol: true, pnlUsdt: true, feesUsdt: true },
      });

      const bySymbol: Record<string, { pnl: number; fees: number; count: number }> = {};
      let totalPnl = 0;
      let totalFees = 0;
      for (const t of closed) {
        const pnl = Number(t.pnlUsdt ?? 0);
        const fees = Number(t.feesUsdt ?? 0);
        totalPnl += pnl;
        totalFees += fees;
        const sym = t.symbol;
        bySymbol[sym] = bySymbol[sym] ?? { pnl: 0, fees: 0, count: 0 };
        bySymbol[sym].pnl += pnl;
        bySymbol[sym].fees += fees;
        bySymbol[sym].count += 1;
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              from: from.toISOString(),
              to: to.toISOString(),
              tradesCount: closed.length,
              pnlUsdt: Number(totalPnl.toFixed(8)),
              feesUsdt: Number(totalFees.toFixed(8)),
              bySymbol,
            }),
          },
        ],
      };
    }

    case "get_open_positions": {
      const portfolio = await prisma.portfolio.findFirst({
        where: { mode: mode === "LIVE" ? "LIVE" : mode === "TESTNET" ? "TESTNET" : "PAPER" },
        orderBy: { createdAt: "asc" },
      });
      if (!portfolio) {
        return { content: [{ type: "text" as const, text: JSON.stringify([]) }] };
      }
      const rows = await prisma.trade.findMany({
        where: { portfolioId: portfolio.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              rows.map((t) => ({
                id: t.id,
                symbol: t.symbol,
                side: t.side,
                qty: Number(t.qty),
                entryPrice: Number(t.entryPrice),
                stopLoss: Number(t.stopLoss),
                takeProfit: t.takeProfit != null ? Number(t.takeProfit) : null,
                openedAt: t.openedAt,
              })),
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown portfolio tool: ${name}`);
  }
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
