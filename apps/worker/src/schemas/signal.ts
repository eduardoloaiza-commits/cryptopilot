import { z } from "zod";

export const SignalSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]+USDT$/),
  direction: z.literal("LONG"),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  // Metadata libre para explicabilidad — el modelo decide la forma (flat,
  // nested por timeframe, mezcla de números/booleans). Nada consume esto
  // programáticamente, así que no lo restringimos.
  indicators: z.record(z.string(), z.unknown()).optional(),
  suggestedSL: z.number().positive().optional(),
  suggestedTP: z.number().positive().optional(),
  generatedAt: z.iso.datetime(),
});

export type Signal = z.infer<typeof SignalSchema>;
export const SignalsArraySchema = z.array(SignalSchema);
