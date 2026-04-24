import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";
import { logAgentCall } from "./agent-log.js";

const __filename = fileURLToPath(import.meta.url);
const SRC_DIR = path.dirname(__filename);
const WORKER_ROOT = path.resolve(SRC_DIR, "..", "..");
const REPO_ROOT = path.resolve(WORKER_ROOT, "..", "..");

const MCP_SERVER_PATH = path.resolve(
  REPO_ROOT,
  "packages",
  "mcp-binance",
  "dist",
  "server.js",
);

export const MCP_SERVER_NAME = "binance";

export type AgentRole =
  | "ORCHESTRATOR"
  | "ANALYST"
  | "TRADER"
  | "RISK_MANAGER"
  | "ACCOUNTANT"
  | "RESEARCHER";

export type AgentPhase = "SCAN" | "DECIDE" | "EXECUTE" | "REPORT" | "SWEEP";

export interface RunAgentOpts<T> {
  role: AgentRole;
  phase: AgentPhase;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  allowedTools: string[];
  outputSchema: z.ZodType<T>;
  maxTurns?: number;
  portfolioId?: string | null;
}

export type RunAgentResult<T> =
  | { ok: true; data: T; raw: string; costUsd: number; durationMs: number }
  | { ok: false; reason: string; raw?: string; costUsd: number; durationMs: number };

/**
 * Invoca un agente Claude con system prompt + MCP Binance + schema Zod.
 * Si el modelo devuelve algo que no pasa el schema, retorna ok:false.
 * Persiste AgentLog automáticamente.
 */
export async function runAgent<T>(opts: RunAgentOpts<T>): Promise<RunAgentResult<T>> {
  const allowedTools = opts.allowedTools.map(
    (t) => `mcp__${MCP_SERVER_NAME}__${t}`,
  );

  const jsonSchema = z.toJSONSchema(opts.outputSchema, { target: "draft-7" });

  const started = Date.now();
  const q = query({
    prompt: opts.userPrompt,
    options: {
      systemPrompt: opts.systemPrompt,
      model: opts.model ?? "claude-sonnet-4-6",
      ...(process.env.CLAUDE_CODE_EXECUTABLE
        ? { pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_EXECUTABLE }
        : {}),
      mcpServers: {
        [MCP_SERVER_NAME]: {
          type: "stdio",
          command: "node",
          args: [MCP_SERVER_PATH],
          env: buildMcpEnv(),
        },
      },
      allowedTools,
      tools: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: opts.maxTurns ?? 20,
      persistSession: false,
      settingSources: [],
      outputFormat: {
        type: "json_schema",
        schema: jsonSchema as Record<string, unknown>,
      },
      stderr: (line) => logger.debug({ role: opts.role, line }, "sdk.stderr"),
    },
  });

  let finalResult: string | null = null;
  let structuredOutput: unknown = undefined;
  let costUsd = 0;
  let errorReason: string | null = null;

  try {
    for await (const msg of q) {
      if (msg.type === "result") {
        costUsd = msg.total_cost_usd ?? 0;
        if (msg.subtype === "success") {
          finalResult = msg.result;
          structuredOutput = msg.structured_output;
        } else {
          errorReason = `sdk.result.${msg.subtype}`;
        }
      }
    }
  } catch (e) {
    errorReason = `query.threw: ${(e as Error).message}`;
  }

  const durationMs = Date.now() - started;

  if (errorReason) {
    await logAgentCall({
      portfolioId: opts.portfolioId ?? null,
      role: opts.role,
      phase: opts.phase,
      input: { userPrompt: opts.userPrompt },
      output: { errorReason, raw: finalResult },
      reasoningMd: null,
      level: "error",
    });
    return { ok: false, reason: errorReason, raw: finalResult ?? undefined, costUsd, durationMs };
  }

  const candidate = structuredOutput ?? tryParseJson(finalResult ?? "");
  const parsed = opts.outputSchema.safeParse(candidate);
  if (!parsed.success) {
    const reason = `schema.validation: ${parsed.error.message.slice(0, 200)}`;
    await logAgentCall({
      portfolioId: opts.portfolioId ?? null,
      role: opts.role,
      phase: opts.phase,
      input: { userPrompt: opts.userPrompt },
      output: { raw: finalResult, structured: structuredOutput },
      reasoningMd: null,
      level: "warn",
    });
    logger.warn({ role: opts.role, reason, issues: parsed.error.issues }, "agent.output.invalid");
    return { ok: false, reason, raw: finalResult ?? undefined, costUsd, durationMs };
  }

  await logAgentCall({
    portfolioId: opts.portfolioId ?? null,
    role: opts.role,
    phase: opts.phase,
    input: { userPrompt: opts.userPrompt },
    output: parsed.data as unknown,
    reasoningMd: finalResult,
    level: "info",
  });

  return {
    ok: true,
    data: parsed.data,
    raw: finalResult ?? "",
    costUsd,
    durationMs,
  };
}

function buildMcpEnv(): Record<string, string> {
  const pass = [
    "MODE",
    "BINANCE_BASE_URL",
    "BINANCE_API_KEY",
    "BINANCE_SECRET",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOG_LEVEL",
  ];
  const env: Record<string, string> = {};
  for (const k of pass) {
    const v = process.env[k];
    if (v) env[k] = v;
  }
  return env;
}

function tryParseJson(s: string): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1] ?? "");
    } catch {}
  }
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start >= 0) {
    try {
      return JSON.parse(s.slice(start));
    } catch {}
  }
  return null;
}
