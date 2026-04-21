import { z } from "zod";

export const OrderProposalSchema = z.object({
  symbol: z.enum(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  qty: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive().optional(),
  rationale: z.string(),
  sourceSignalId: z.string().optional(),
});

export type OrderProposal = z.infer<typeof OrderProposalSchema>;
