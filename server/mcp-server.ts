import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Express, Request, Response } from "express";
import { TOOL_DEFINITIONS, executeTool, getAllToolDefinitions } from "./tools";

const ADMIN_TENANT_ID = 1;

const SENSITIVE_TOOLS = new Set([
  "test_api_keys", "manage_api_keys", "admin_dashboard",
  "manage_tenants", "system_config", "exec", "execute_code",
]);

function convertToolDefToMcp(toolDef: any) {
  const fn = toolDef.function;
  return {
    name: `visionclaw_${fn.name}`,
    description: fn.description || "",
    inputSchema: {
      type: "object" as const,
      properties: fn.parameters?.properties || {},
      required: fn.parameters?.required || [],
    },
  };
}

export function createMcpServer(tenantId: number = ADMIN_TENANT_ID): Server {
  const server = new Server(
    {
      name: "visionclaw-agent",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = await getAllToolDefinitions();
    const filtered = allTools.filter(t => !SENSITIVE_TOOLS.has(t.function.name));
    return {
      tools: filtered.map(convertToolDefToMcp),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const rawName = request.params.name;
    const toolName = rawName.startsWith("visionclaw_") ? rawName.slice(11) : rawName;

    if (SENSITIVE_TOOLS.has(toolName)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Tool not available via MCP" }) }],
        isError: true,
      };
    }

    const params = { ...(request.params.arguments || {}), _tenantId: tenantId };
    const startTime = Date.now();

    try {
      console.log(`[mcp-server] Executing tool: ${toolName} for tenant ${tenantId}`);
      const result = await executeTool(toolName, params);
      const elapsed = Date.now() - startTime;
      console.log(`[mcp-server] Tool ${toolName} completed in ${elapsed}ms`);

      const resultText = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (err: any) {
      console.error(`[mcp-server] Tool ${toolName} failed:`, err.message);
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "visionclaw://system/status",
          name: "System Status",
          description: "Current system health, uptime, and active services",
          mimeType: "application/json",
        },
        {
          uri: "visionclaw://system/personas",
          name: "Available Personas",
          description: "List of all 14 AI personas and their capabilities",
          mimeType: "application/json",
        },
        {
          uri: "visionclaw://system/tools",
          name: "Tool Catalog",
          description: "Complete catalog of all available tools with descriptions",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    switch (uri) {
      case "visionclaw://system/status": {
        const result = await executeTool("check_system_status", { _tenantId: tenantId });
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }
      case "visionclaw://system/personas": {
        const result = await executeTool("list_personas", { _tenantId: tenantId });
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }
      case "visionclaw://system/tools": {
        const allTools = await getAllToolDefinitions();
        const catalog = allTools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameterCount: Object.keys(t.function.parameters?.properties || {}).length,
        }));
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ totalTools: catalog.length, tools: catalog }, null, 2),
          }],
        };
      }
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}

const sseTransports = new Map<string, SSEServerTransport>();

export function registerMcpRoutes(app: Express): void {
  app.get("/api/mcp/sse", async (req: Request, res: Response) => {
    console.log("[mcp-server] SSE connection established");
    const transport = new SSEServerTransport("/api/mcp/messages", res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);

    const server = createMcpServer(ADMIN_TENANT_ID);
    
    res.on("close", () => {
      console.log(`[mcp-server] SSE connection closed: ${sessionId}`);
      sseTransports.delete(sessionId);
    });

    await server.connect(transport);
  });

  app.post("/api/mcp/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(400).json({ error: "No active SSE connection for this session" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.get("/api/mcp/info", (_req: Request, res: Response) => {
    const toolCount = TOOL_DEFINITIONS.length;
    res.json({
      name: "VisionClaw Agent MCP Server",
      version: "1.0.0",
      protocol: "MCP (Model Context Protocol)",
      transport: ["SSE (Server-Sent Events)"],
      endpoints: {
        sse: "/api/mcp/sse",
        messages: "/api/mcp/messages",
      },
      capabilities: {
        tools: toolCount,
        resources: 3,
        personas: 14,
        models: "36+",
      },
      description: "Multi-tenant agentic AI platform exposing 97+ tools via the Model Context Protocol. Connect any MCP-compatible client to access VisionClaw's full tool suite.",
    });
  });

  console.log("[mcp-server] MCP Server routes registered (SSE transport on /api/mcp/sse)");
}

export async function startStdioMcpServer(): Promise<void> {
  const server = createMcpServer(ADMIN_TENANT_ID);
  const transport = new StdioServerTransport();
  console.log("[mcp-server] Starting MCP server on stdio transport...");
  await server.connect(transport);
}
