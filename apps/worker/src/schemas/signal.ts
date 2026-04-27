import { z } from "zod";

export const SignalSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]+USDT$/),
  direction: z.literal("LONG"),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  // El modelo puede emitir indicators flat ({rsi: 60}) o nested por timeframe
  // ({"1h": {rsi: 60, ema: ...}}). Aceptamos ambas porque es metadata para
  // explicabilidad — nadie consume esto programáticamente.
  indicators: z
    .record(
      z.string(),
      z.union([z.number(), z.record(z.string(), z.number())]),
    )
    .optional(),
  suggestedSL: z.number().positive().optional(),
  suggestedTP: z.number().positive().optional(),
  generatedAt: z.iso.datetime(),
});

export type Signal = z.infer<typeof SignalSchema>;
export const SignalsArraySchema = z.array(SignalSchema);
