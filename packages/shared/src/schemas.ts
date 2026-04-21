import { z } from "zod";
import { WHITELIST_SYMBOLS } from "./constants.js";

export const SymbolSchema = z.enum(WHITELIST_SYMBOLS);
export const SideSchema = z.enum(["BUY", "SELL"]);
export const ModeSchema = z.enum(["PAPER", "TESTNET", "LIVE"]);

export const GuardrailsConfigSchema = z.object({
  maxPerTradePct: z.number().positive().max(0.1),
  stopLossPct: z.number().positive().max(0.1),
  takeProfitPct: z.number().positive().max(0.2).optional(),
  dailyLossLimitPct: z.number().positive().max(0.2),
  maxOpenPositions: z.number().int().min(1).max(10),
});
export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;

export const OrderInputSchema = z.object({
  symbol: SymbolSchema,
  side: SideSchema,
  type: z.enum(["MARKET", "LIMIT"]),
  qty: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive().optional(),
});
export type OrderInput = z.infer<typeof OrderInputSchema>;
