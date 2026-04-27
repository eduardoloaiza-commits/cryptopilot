import OpenAI from "openai";
import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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
  /**
   * Prompt del sistema. Aceptamos string o array (string[]) por
   * compatibilidad con la firma anterior — internamente se concatena.
   * OpenAI hace prompt caching automáticamente cuando el prefijo se repite,
   * sin necesidad de markers explícitos.
   */
  systemPrompt: string | string[];
  userPrompt: string;
  model?: string;
  /**
   * Nombres de tools MCP (sin prefijo) que el agente puede invocar.
   * Si está vacío, no se expone ninguna tool y el modelo debe responder
   * directamente con JSON.
   */
  allowedTools: string[];
  outputSchema: z.ZodType<T>;
  maxTurns?: number;
  portfolioId?: string | null;
}

export type RunAgentResult<T> =
  | { ok: true; data: T; raw: string; costUsd: number; durationMs: number }
  | { ok: false; reason: string; raw?: string; costUsd: number; durationMs: number };

// Lazy-init: el cliente se construye en la primera llamada a runAgent, no al
// importar el módulo. Esto permite que `dotenv.config()` (en index.ts) cargue
// el .env antes de que el SDK lea OPENAI_API_KEY del entorno.
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// Precios en USD por 1M tokens (input / cached / output).
// Fuente: https://platform.openai.com/docs/pricing — actualizar si cambia.
const PRICE_TABLE: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-4.1": { input: 2.0, cached: 0.5, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, cached: 0.1, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, cached: 0.025, output: 0.4 },
  "gpt-5": { input: 1.25, cached: 0.125, output: 10.0 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2.0 },
  "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
  "gpt-4o": { input: 2.5, cached: 1.25, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
  "o3-mini": { input: 1.1, cached: 0.55, output: 4.4 },
};

function priceFor(model: string): { input: number; cached: number; output: number } | null {
  const exact = PRICE_TABLE[model];
  if (exact) return exact;
  // Fallback por familia (matchea por prefijo más largo).
  const match = Object.keys(PRICE_TABLE)
    .sort((a, b) => b.length - a.length)
    .find((k) => model.startsWith(k));
  return match ? (PRICE_TABLE[match] ?? null) : null;
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

function computeCost(model: string, usage: OpenAIUsage | null | undefined): number {
  if (!usage) return 0;
  const p = priceFor(model);
  if (!p) {
    logger.debug({ model }, "agent-sdk.cost.unknown-model");
    return 0;
  }
  const inputTotal = usage.prompt_tokens ?? 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const fresh = Math.max(0, inputTotal - cached);
  const out = usage.completion_tokens ?? 0;
  return (fresh * p.input + cached * p.cached + out * p.output) / 1_000_000;
}

/**
 * Invoca un agente OpenAI con system prompt + MCP Binance + schema Zod.
 * Si el modelo devuelve algo que no pasa el schema, retorna ok:false.
 * Persiste AgentLog automáticamente.
 */
export async function runAgent<T>(opts: RunAgentOpts<T>): Promise<RunAgentResult<T>> {
  const started = Date.now();
  const model = opts.model ?? "gpt-4.1-mini";
  const systemPrompt = Array.isArray(opts.systemPrompt)
    ? opts.systemPrompt.join("\n\n")
    : opts.systemPrompt;
  const allowedToolNames = new Set(opts.allowedTools);
  const maxTurns = opts.maxTurns ?? 20;

  const transport = new StdioClientTransport({
    command: "node",
    args: [MCP_SERVER_PATH],
    env: buildMcpEnv(),
  });
  const mcp = new MCPClient(
    { name: "cryptopilot-worker", version: "1.0.0" },
    { capabilities: {} },
  );

  let totalCostUsd = 0;
  let errorReason: string | null = null;
  let finalContent: string | null = null;

  try {
    await mcp.connect(transport);

    const listed = await mcp.listTools();
    const mcpTools = (listed.tools ?? []).filter(
      (t) => allowedToolNames.size === 0 || allowedToolNames.has(t.name),
    );

    const oaiTools = mcpTools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: normalizeJsonSchema(t.inputSchema),
      },
    }));

    const jsonSchema = z.toJSONSchema(opts.outputSchema, { target: "draft-7" });
    const responseFormat = {
      type: "json_schema" as const,
      json_schema: {
        name: "agent_output",
        strict: false,
        schema: jsonSchema as Record<string, unknown>,
      },
    };

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: opts.userPrompt },
    ];

    for (let turn = 0; turn < maxTurns; turn++) {
      const completion = await getOpenAI().chat.completions.create({
        model,
        messages,
        ...(oaiTools.length > 0
          ? { tools: oaiTools, tool_choice: "auto" as const }
          : {}),
        response_format: responseFormat,
      });

      totalCostUsd += computeCost(model, completion.usage as OpenAIUsage | null | undefined);

      const choice = completion.choices[0];
      if (!choice) {
        errorReason = "no.choice";
        break;
      }
      const msg = choice.message;
      messages.push(msg as OpenAI.Chat.ChatCompletionMessageParam);

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          if (tc.type !== "function") continue;
          const name = tc.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = tc.function.arguments
              ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
              : {};
          } catch {
            args = {};
          }
          let toolResultText = "";
          try {
            const result = await mcp.callTool({ name, arguments: args });
            toolResultText = renderMcpContent(result.content);
          } catch (e) {
            toolResultText = `ERROR: ${(e as Error).message}`;
          }
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResultText,
          });
        }
        continue;
      }

      finalContent = msg.content ?? "";
      break;
    }

    if (finalContent === null && !errorReason) {
      errorReason = `max.turns.reached(${maxTurns})`;
    }
  } catch (e) {
    errorReason = `query.threw: ${(e as Error).message}`;
  } finally {
    try {
      await mcp.close();
    } catch {
      // ignore
    }
  }

  const durationMs = Date.now() - started;

  if (errorReason) {
    await logAgentCall({
      portfolioId: opts.portfolioId ?? null,
      role: opts.role,
      phase: opts.phase,
      input: { userPrompt: opts.userPrompt },
      output: { errorReason, raw: finalContent },
      reasoningMd: null,
      level: "error",
    });
    return {
      ok: false,
      reason: errorReason,
      raw: finalContent ?? undefined,
      costUsd: totalCostUsd,
      durationMs,
    };
  }

  const candidate = tryParseJson(finalContent ?? "");
  const parsed = opts.outputSchema.safeParse(candidate);
  if (!parsed.success) {
    const reason = `schema.validation: ${parsed.error.message.slice(0, 200)}`;
    await logAgentCall({
      portfolioId: opts.portfolioId ?? null,
      role: opts.role,
      phase: opts.phase,
      input: { userPrompt: opts.userPrompt },
      output: { raw: finalContent },
      reasoningMd: null,
      level: "warn",
    });
    logger.warn(
      { role: opts.role, reason, issues: parsed.error.issues },
      "agent.output.invalid",
    );
    return {
      ok: false,
      reason,
      raw: finalContent ?? undefined,
      costUsd: totalCostUsd,
      durationMs,
    };
  }

  await logAgentCall({
    portfolioId: opts.portfolioId ?? null,
    role: opts.role,
    phase: opts.phase,
    input: { userPrompt: opts.userPrompt },
    output: parsed.data as unknown,
    reasoningMd: finalContent,
    level: "info",
  });

  return {
    ok: true,
    data: parsed.data,
    raw: finalContent ?? "",
    costUsd: totalCostUsd,
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

function normalizeJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }
  const s = schema as Record<string, unknown>;
  if (s.type !== "object") {
    return { type: "object", properties: {} };
  }
  return s;
}

function renderMcpContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => {
      const item = c as { type?: string; text?: string };
      if (item.type === "text" && typeof item.text === "string") return item.text;
      return JSON.stringify(c);
    })
    .join("\n");
}

function tryParseJson(s: string): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    // ignore
  }
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1] ?? "");
    } catch {
      // ignore
    }
  }
  const firstBrace = s.indexOf("{");
  const firstBracket = s.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);
  if (start >= 0) {
    try {
      return JSON.parse(s.slice(start));
    } catch {
      // ignore
    }
  }
  return null;
}
