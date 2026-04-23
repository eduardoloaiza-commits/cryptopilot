import { prisma } from "@cryptopilot/db";
import { logger } from "./logger.js";
import type { AgentRole, AgentPhase } from "./agent-sdk.js";

export interface LogAgentCallArgs {
  portfolioId: string | null;
  role: AgentRole;
  phase: AgentPhase;
  toolName?: string | null;
  input?: unknown;
  output?: unknown;
  reasoningMd?: string | null;
  level?: "info" | "warn" | "error" | "debug";
}

export async function logAgentCall(args: LogAgentCallArgs): Promise<void> {
  try {
    await prisma.agentLog.create({
      data: {
        portfolioId: args.portfolioId ?? null,
        role: args.role,
        phase: args.phase,
        toolName: args.toolName ?? null,
        input: (args.input ?? null) as never,
        output: (args.output ?? null) as never,
        reasoningMd: args.reasoningMd ?? null,
        level: args.level ?? "info",
      },
    });
  } catch (err) {
    logger.error({ err, role: args.role, phase: args.phase }, "agent-log.persist.failed");
  }
}
