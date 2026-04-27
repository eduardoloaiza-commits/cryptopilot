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

/**
 * Output enriquecido del Analyst: además del array de señales, captura el
 * régimen detectado (con motivo) y por qué se descartó cada candidato. Esto
 * preserva la "caja blanca" que perdimos al pasar a OpenAI con structured
 * output (con Claude Agent SDK teníamos el chain of thought streamed; ahora
 * el modelo solo emite JSON, así que el JSON tiene que llevar la explicación).
 */
export const AnalystOutputSchema = z.object({
  regime: z.enum(["Bullish", "Rangebound", "Bearish", "Overextended", "Unknown"]),
  regimeReason: z.string().min(1),
  rejected: z
    .array(
      z.object({
        symbol: z.string(),
        reason: z.string(),
      }),
    )
    .optional(),
  signals: z.array(SignalSchema),
});

export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;
