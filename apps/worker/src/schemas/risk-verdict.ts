import { z } from "zod";

export const RiskVerdictSchema = z.object({
  allow: z.boolean(),
  reason: z.string(),
  constraints: z
    .object({
      maxPositionUsdt: z.number().positive().optional(),
      remainingDailyLossBudgetUsdt: z.number().optional(),
      openPositionsCount: z.number().int().optional(),
    })
    .optional(),
});

export type RiskVerdict = z.infer<typeof RiskVerdictSchema>;
