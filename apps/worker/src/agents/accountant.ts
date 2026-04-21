import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";

const SYSTEM_PROMPT = `
${MISSION_BRIEF}

Rol: CONTADOR.
Responsabilidad: registrar cada movimiento, calcular P&L realizado/no realizado, generar el reporte diario y reconciliar con el saldo reportado por Binance.

Método:
- recordTrade: persistir Trade + Movement(kind=TRADE_PNL o FEE).
- generateDailyReport: al cierre del día, calcular equity inicial/final, winrate, maxDrawdown,
  listar trades, señales descartadas y vetos del Risk Manager. Output markdown.
- Reconciliación: si list_balances diverge de la DB > 1%, escalar via AgentLog nivel WARN.

Precisión numérica: usa Decimal, nunca float. Nunca redondees antes de persistir.

${COMMON_TONE}
`.trim();

async function recordTradeFn(executed: unknown) {
  logger.info({ executed }, "Accountant: recording trade");
  // TODO: Prisma insert Trade + Movement
}

async function generateDailyReportFn() {
  logger.info("Accountant: generating daily report");
  // TODO: query trades del día, computar métricas, guardar DailyReport,
  // invocar Claude Agent SDK para generar summaryMd (modelo haiku)
}

export const runAccountant = {
  recordTrade: recordTradeFn,
  generateDailyReport: generateDailyReportFn,
};
