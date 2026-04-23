import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDashboard();
  if (!data) {
    return NextResponse.json({
      mode: process.env.MODE ?? "PAPER",
      portfolio: null,
    });
  }
  return NextResponse.json({
    mode: process.env.MODE ?? "PAPER",
    portfolio: {
      id: data.portfolio.id,
      equityUsdt: Number(data.portfolio.currentEquity),
      initialCapitalUsdt: Number(data.portfolio.initialCapital),
      createdAt: data.portfolio.createdAt,
    },
    killSwitchActive: data.portfolio.guardrails?.killSwitchTriggered ?? false,
    killSwitchReason: data.portfolio.guardrails?.killSwitchReason ?? null,
    openPositions: data.openCount,
    todayPnlUsdt: data.todayPnlUsdt,
    todayFeesUsdt: data.todayFeesUsdt,
    tradesClosedToday: data.tradesClosedToday,
  });
}
