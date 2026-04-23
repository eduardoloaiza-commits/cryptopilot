import { prisma, Prisma } from "@cryptopilot/db";
import { getBinanceClient } from "./binance-client.js";

const SLIPPAGE_BPS = 5;

async function getActivePaperPortfolio() {
  return prisma.portfolio.findFirst({
    where: { mode: "PAPER" },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchMarkPrice(symbol: string): Promise<number> {
  const client = getBinanceClient();
  const t = (await client.symbolPriceTicker({ symbol })) as { price: string };
  const px = Number(t.price);
  if (!Number.isFinite(px) || px <= 0) throw new Error(`invalid mark price: ${JSON.stringify(t)}`);
  return px;
}

export interface PaperFillInput {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  qty: number;
  limitPrice?: number;
  stopLoss: number;
  takeProfit?: number;
  reasoningAi?: string;
  sourceSignal?: string;
}

export interface PaperFillResult {
  orderId: string;
  tradeId: string;
  symbol: string;
  side: "BUY" | "SELL";
  filledQty: number;
  avgPrice: number;
  feesUsdt: number;
  stopLoss: number;
  takeProfit: number | null;
  portfolioId: string;
  openedAt: string;
}

export async function simulatePaperFill(input: PaperFillInput): Promise<PaperFillResult> {
  const portfolio = await getActivePaperPortfolio();
  if (!portfolio) throw new Error("No PAPER portfolio found. Run the worker once to seed it.");

  const mark = await fetchMarkPrice(input.symbol);
  const baseRef =
    input.type === "LIMIT" && input.limitPrice
      ? Math.min(input.limitPrice, mark) /* conservative for BUY */
      : mark;
  const slipFactor = SLIPPAGE_BPS / 10_000;
  const fillPrice = input.side === "BUY" ? baseRef * (1 + slipFactor) : baseRef * (1 - slipFactor);

  const notional = fillPrice * input.qty;
  const feesUsdt = notional * 0.001;

  const openedAt = new Date();

  const trade = await prisma.trade.create({
    data: {
      portfolioId: portfolio.id,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      entryPrice: new Prisma.Decimal(fillPrice.toFixed(8)),
      qty: new Prisma.Decimal(input.qty),
      stopLoss: new Prisma.Decimal(input.stopLoss),
      takeProfit: input.takeProfit ? new Prisma.Decimal(input.takeProfit) : null,
      status: "OPEN",
      feesUsdt: new Prisma.Decimal(feesUsdt.toFixed(8)),
      reasoningAi: input.reasoningAi ?? null,
      sourceSignal: input.sourceSignal ?? null,
      openedAt,
      binanceOrderId: null,
      movements: {
        create: {
          portfolioId: portfolio.id,
          kind: "FEE",
          amountUsdt: new Prisma.Decimal((-feesUsdt).toFixed(8)),
          note: `Paper fill fee ${input.symbol} ${input.side} qty=${input.qty}`,
        },
      },
    },
  });

  return {
    orderId: `paper_${trade.id}`,
    tradeId: trade.id,
    symbol: input.symbol,
    side: input.side,
    filledQty: input.qty,
    avgPrice: fillPrice,
    feesUsdt,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit ?? null,
    portfolioId: portfolio.id,
    openedAt: openedAt.toISOString(),
  };
}

export interface ClosePaperTradeInput {
  tradeId: string;
  reason: "TP_HIT" | "SL_HIT" | "MANUAL" | "SWEEP";
  exitPriceOverride?: number;
}

export async function closePaperTrade(input: ClosePaperTradeInput) {
  const trade = await prisma.trade.findUnique({ where: { id: input.tradeId } });
  if (!trade) throw new Error(`Trade ${input.tradeId} not found`);
  if (trade.status !== "OPEN") throw new Error(`Trade ${input.tradeId} is not OPEN (${trade.status})`);

  const mark = input.exitPriceOverride ?? (await fetchMarkPrice(trade.symbol));
  const slipFactor = SLIPPAGE_BPS / 10_000;
  const exitPrice =
    trade.side === "BUY" ? mark * (1 - slipFactor) : mark * (1 + slipFactor);

  const qty = Number(trade.qty);
  const entry = Number(trade.entryPrice);
  const pnlGross = trade.side === "BUY" ? (exitPrice - entry) * qty : (entry - exitPrice) * qty;
  const exitFees = exitPrice * qty * 0.001;
  const totalFees = Number(trade.feesUsdt ?? 0) + exitFees;
  const pnlNet = pnlGross - exitFees;

  const closedAt = new Date();

  await prisma.$transaction([
    prisma.trade.update({
      where: { id: trade.id },
      data: {
        exitPrice: new Prisma.Decimal(exitPrice.toFixed(8)),
        status: "CLOSED",
        pnlUsdt: new Prisma.Decimal(pnlNet.toFixed(8)),
        feesUsdt: new Prisma.Decimal(totalFees.toFixed(8)),
        closedAt,
      },
    }),
    prisma.movement.create({
      data: {
        portfolioId: trade.portfolioId,
        tradeId: trade.id,
        kind: "TRADE_PNL",
        amountUsdt: new Prisma.Decimal(pnlNet.toFixed(8)),
        note: `Close ${trade.symbol} ${trade.side} reason=${input.reason}`,
      },
    }),
    prisma.movement.create({
      data: {
        portfolioId: trade.portfolioId,
        tradeId: trade.id,
        kind: "FEE",
        amountUsdt: new Prisma.Decimal((-exitFees).toFixed(8)),
        note: `Exit fee ${trade.symbol}`,
      },
    }),
    prisma.portfolio.update({
      where: { id: trade.portfolioId },
      data: {
        currentEquity: { increment: new Prisma.Decimal(pnlNet.toFixed(8)) },
      },
    }),
  ]);

  return {
    tradeId: trade.id,
    exitPrice,
    pnlUsdt: pnlNet,
    feesUsdt: totalFees,
    reason: input.reason,
    closedAt: closedAt.toISOString(),
  };
}
