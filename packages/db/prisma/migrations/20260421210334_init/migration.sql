-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('PAPER', 'TESTNET', 'LIVE');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRADE_PNL', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('ORCHESTRATOR', 'ANALYST', 'TRADER', 'RISK_MANAGER', 'ACCOUNTANT', 'RESEARCHER');

-- CreateEnum
CREATE TYPE "AgentPhase" AS ENUM ('SCAN', 'DECIDE', 'EXECUTE', 'REPORT', 'SWEEP');

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "initialCapital" DECIMAL(20,8) NOT NULL,
    "currentEquity" DECIMAL(20,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "type" TEXT NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "exitPrice" DECIMAL(20,8),
    "qty" DECIMAL(20,8) NOT NULL,
    "stopLoss" DECIMAL(20,8) NOT NULL,
    "takeProfit" DECIMAL(20,8),
    "status" "TradeStatus" NOT NULL,
    "pnlUsdt" DECIMAL(20,8),
    "feesUsdt" DECIMAL(20,8),
    "reasoningAi" TEXT,
    "sourceSignal" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "binanceOrderId" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "tradeId" TEXT,
    "kind" "MovementKind" NOT NULL,
    "amountUsdt" DECIMAL(20,8) NOT NULL,
    "feeAsset" TEXT,
    "note" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startEquity" DECIMAL(20,8) NOT NULL,
    "endEquity" DECIMAL(20,8) NOT NULL,
    "pnlUsdt" DECIMAL(20,8) NOT NULL,
    "pnlPct" DECIMAL(10,6) NOT NULL,
    "tradesCount" INTEGER NOT NULL,
    "winrate" DECIMAL(5,4) NOT NULL,
    "maxDrawdown" DECIMAL(10,6) NOT NULL,
    "summaryMd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardrails" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "maxPerTradePct" DECIMAL(5,4) NOT NULL,
    "stopLossPct" DECIMAL(5,4) NOT NULL,
    "takeProfitPct" DECIMAL(5,4),
    "dailyLossLimitPct" DECIMAL(5,4) NOT NULL,
    "maxOpenPositions" INTEGER NOT NULL DEFAULT 3,
    "killSwitchTriggered" BOOLEAN NOT NULL DEFAULT false,
    "killSwitchReason" TEXT,
    "proposedByAi" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardrails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "AgentRole" NOT NULL,
    "phase" "AgentPhase" NOT NULL,
    "toolName" TEXT,
    "input" JSONB,
    "output" JSONB,
    "reasoningMd" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_portfolioId_status_idx" ON "Trade"("portfolioId", "status");

-- CreateIndex
CREATE INDEX "Trade_portfolioId_openedAt_idx" ON "Trade"("portfolioId", "openedAt");

-- CreateIndex
CREATE INDEX "Movement_portfolioId_ts_idx" ON "Movement"("portfolioId", "ts");

-- CreateIndex
CREATE INDEX "Movement_kind_idx" ON "Movement"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_portfolioId_date_key" ON "DailyReport"("portfolioId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Guardrails_portfolioId_key" ON "Guardrails"("portfolioId");

-- CreateIndex
CREATE INDEX "AgentLog_portfolioId_ts_idx" ON "AgentLog"("portfolioId", "ts");

-- CreateIndex
CREATE INDEX "AgentLog_role_ts_idx" ON "AgentLog"("role", "ts");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardrails" ADD CONSTRAINT "Guardrails_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
