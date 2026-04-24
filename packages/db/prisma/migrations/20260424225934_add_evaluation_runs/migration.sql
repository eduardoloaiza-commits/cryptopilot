-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "label" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "startEquity" DECIMAL(20,8) NOT NULL,
    "endEquity" DECIMAL(20,8),
    "reportMd" TEXT,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationRun_portfolioId_status_idx" ON "EvaluationRun"("portfolioId", "status");

-- CreateIndex
CREATE INDEX "EvaluationRun_endsAt_idx" ON "EvaluationRun"("endsAt");

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
