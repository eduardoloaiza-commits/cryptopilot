import { NextResponse } from "next/server";

export async function GET() {
  // TODO: leer Portfolio + Guardrails + últimos AgentLog
  return NextResponse.json({
    mode: process.env.MODE ?? "PAPER",
    killSwitchActive: false,
    openPositions: 0,
    todayPnlUsdt: 0,
  });
}
