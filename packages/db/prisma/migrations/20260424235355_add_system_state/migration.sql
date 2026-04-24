-- CreateTable
CREATE TABLE "SystemState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "activeMode" "Mode" NOT NULL DEFAULT 'PAPER',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);
