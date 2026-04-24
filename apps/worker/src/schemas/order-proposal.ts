import { z } from "zod";

export const OrderProposalSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]+USDT$/),
  side: z.literal("BUY"),
  type: z.enum(["MARKET", "LIMIT"]),
  qty: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive().optional(),
  rationale: z.string(),
  sourceSignalId: z.string().optional(),
});

export type OrderProposal = z.infer<typeof OrderProposalSchema>;
