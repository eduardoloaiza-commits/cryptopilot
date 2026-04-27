import { z } from "zod";

// El modelo puede devolver `null` para campos que no calculó o que considera
// no aplicables. Aceptamos null + undefined indistintamente (los tratamos como
// "no constraint provided") en lugar de bloquear todo el ciclo por schema.
const optionalNumber = z.number().nullish();
const optionalPositive = z
  .number()
  .nullish()
  .refine((v) => v == null || v > 0, "must be > 0 if provided");

export const RiskVerdictSchema = z.object({
  allow: z.boolean(),
  reason: z.string(),
  constraints: z
    .object({
      maxPositionUsdt: optionalPositive,
      remainingDailyLossBudgetUsdt: optionalNumber,
      openPositionsCount: z.number().int().nullish(),
    })
    .nullish(),
});

export type RiskVerdict = z.infer<typeof RiskVerdictSchema>;
