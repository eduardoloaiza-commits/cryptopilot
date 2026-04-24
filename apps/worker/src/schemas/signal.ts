import { z } from "zod";

export const SignalSchema = z.object({
  symbol: z.enum(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]),
  direction: z.literal("LONG"),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  indicators: z.record(z.string(), z.number()).optional(),
  suggestedSL: z.number().positive().optional(),
  suggestedTP: z.number().positive().optional(),
  generatedAt: z.iso.datetime(),
});

export type Signal = z.infer<typeof SignalSchema>;
export const SignalsArraySchema = z.array(SignalSchema);
