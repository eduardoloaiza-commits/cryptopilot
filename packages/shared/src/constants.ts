/**
 * Pares "core" — BTC es el ancla de régimen macro (siempre se evalúa),
 * los otros 3 son un fallback razonable si el discovery del universo falla.
 * Para el trading real, el universo es dinámico (ver `universe.ts`).
 */
export const CORE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
export type CoreSymbol = (typeof CORE_SYMBOLS)[number];

/** @deprecated Usar universo dinámico via `getUniverse()` de `./universe`. */
export const WHITELIST_SYMBOLS = CORE_SYMBOLS;
/** @deprecated Legacy — hoy `symbol` es string validado contra el universo dinámico. */
export type WhitelistSymbol = CoreSymbol;

export const DEFAULT_CYCLE_INTERVAL_MS = 30_000;
export const DEFAULT_SWEEP_CRON = "*/15 * * * *";
export const DEFAULT_DAILY_REPORT_CRON = "59 23 * * *";
export const DEFAULT_TIMEZONE = "America/Santiago";

export const AGENT_ROLES = [
  "ORCHESTRATOR",
  "ANALYST",
  "TRADER",
  "RISK_MANAGER",
  "ACCOUNTANT",
  "RESEARCHER",
] as const;
export type AgentRoleName = (typeof AGENT_ROLES)[number];
