import { prisma } from "@cryptopilot/db";
import { logger } from "./logger.js";
import { getActivePortfolio } from "./portfolio.js";
import { closePaperTrade } from "@cryptopilot/mcp-binance/paper-engine";

interface TickerResp {
  price: string;
}

async function fetchTicker(symbol: string): Promise<number> {
  const baseUrl = process.env.BINANCE_BASE_URL ?? "https://testnet.binance.vision";
  const res = await fetch(`${baseUrl}/api/v3/ticker/price?symbol=${symbol}`);
  if (!res.ok) throw new Error(`ticker ${symbol} ${res.status}`);
  const body = (await res.json()) as TickerResp;
  return Number(body.price);
}

export async function runSlTpSweep(): Promise<{ checked: number; closed: number }> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return { checked: 0, closed: 0 };

  const openTrades = await prisma.trade.findMany({
    where: { portfolioId: portfolio.id, status: "OPEN" },
  });
  if (openTrades.length === 0) return { checked: 0, closed: 0 };

  const priceCache = new Map<string, number>();
  let closed = 0;

  for (const t of openTrades) {
    let price = priceCache.get(t.symbol);
    if (price == null) {
      try {
        price = await fetchTicker(t.symbol);
        priceCache.set(t.symbol, price);
      } catch (err) {
        logger.warn({ err, symbol: t.symbol }, "sweep.ticker.failed");
        continue;
      }
    }

    const sl = Number(t.stopLoss);
    const tp = t.takeProfit != null ? Number(t.takeProfit) : null;
    const reason =
      t.side === "BUY"
        ? price <= sl
          ? "SL_HIT"
          : tp != null && price >= tp
            ? "TP_HIT"
            : null
        : price >= sl
          ? "SL_HIT"
          : tp != null && price <= tp
            ? "TP_HIT"
            : null;

    if (reason) {
      try {
        const res = await closePaperTrade({
          tradeId: t.id,
          reason,
          exitPriceOverride: price,
        });
        logger.info({ tradeId: t.id, reason, pnl: res.pnlUsdt }, "sweep.closed");
        closed += 1;
      } catch (err) {
        logger.error({ err, tradeId: t.id }, "sweep.close.failed");
      }
    }
  }

  return { checked: openTrades.length, closed };
}
