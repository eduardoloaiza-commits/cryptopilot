#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { marketTools, handleMarketTool } from "./tools/market.js";
import { tradingTools, handleTradingTool } from "./tools/trading.js";
import { portfolioTools, handlePortfolioTool } from "./tools/portfolio.js";
import { guardrailTools, handleGuardrailTool } from "./tools/guardrails.js";

const server = new Server(
  { name: "cryptopilot-binance", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

const allTools = [
  ...marketTools,
  ...tradingTools,
  ...portfolioTools,
  ...guardrailTools,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = req.params.arguments ?? {};

  if (marketTools.some((t) => t.name === name)) return handleMarketTool(name, args);
  if (tradingTools.some((t) => t.name === name)) return handleTradingTool(name, args);
  if (portfolioTools.some((t) => t.name === name)) return handlePortfolioTool(name, args);
  if (guardrailTools.some((t) => t.name === name)) return handleGuardrailTool(name, args);

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[mcp-binance] ready on stdio");
