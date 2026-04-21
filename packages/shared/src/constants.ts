export const WHITELIST_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
export type WhitelistSymbol = (typeof WHITELIST_SYMBOLS)[number];

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
