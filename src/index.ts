#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { StreamableHttpMcpClient } from "./streamableHttpMcpClient.js";
import { webSearch } from "./searxng.js";
import {
  FETCH_AND_EXTRACT_TOOL,
  ROTATE_VPN_TOOL,
  WEB_SEARCH_TOOL,
  isFetchAndExtractArgs,
  isRotateVpnArgs,
  isWebSearchArgs,
} from "./types.js";
import { createConfigResource, createHelpResource } from "./resources.js";

const packageVersion = "0.1.1";

async function main() {
  const config = loadConfig(process.env);
  const trafilaturaClient = new StreamableHttpMcpClient({
    url: config.trafilaturaMcpUrl,
    bearerToken: config.trafilaturaBearerToken,
  });

  const server = new Server(
    { name: "@oremus-labs/web-search-mcp", version: packageVersion },
    {
      capabilities: {
        logging: {},
        resources: {},
        tools: { listChanged: false },
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [WEB_SEARCH_TOOL, FETCH_AND_EXTRACT_TOOL, ROTATE_VPN_TOOL] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "web_search") {
      if (!isWebSearchArgs(args)) throw new Error("Invalid arguments for web_search");
      const result = await webSearch(config.searxngUrl, config.searxngUserAgent, args);
      return { content: [{ type: "text", text: result }] };
    }

    if (name === "fetch_and_extract") {
      if (!isFetchAndExtractArgs(args)) throw new Error("Invalid arguments for fetch_and_extract");
      const result = await trafilaturaClient.callTool("fetch_and_extract", {
        url: args.url,
        include_comments: args.include_comments ?? false,
        include_tables: args.include_tables ?? false,
        use_proxy: args.use_proxy ?? true,
      });
      return { content: result.content };
    }

    if (name === "rotate_vpn") {
      if (!isRotateVpnArgs(args)) throw new Error("Invalid arguments for rotate_vpn");
      const result = await trafilaturaClient.callTool("rotate_vpn", {});
      return { content: result.content };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "config://server-config",
          mimeType: "application/json",
          name: "Server Configuration",
          description: "Current server configuration and environment variables",
        },
        {
          uri: "help://usage-guide",
          mimeType: "text/markdown",
          name: "Usage Guide",
          description: "How to use this server effectively",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === "config://server-config") {
      return {
        contents: [{ uri, mimeType: "application/json", text: createConfigResource(config) }],
      };
    }
    if (uri === "help://usage-guide") {
      return {
        contents: [{ uri, mimeType: "text/markdown", text: createHelpResource() }],
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });

  if (process.stdin.isTTY) {
    console.log(`web-search-mcp v${packageVersion} - Ready`);
    console.log(`SearXNG URL: ${config.searxngUrl}`);
    console.log(`Trafilatura MCP URL: ${config.trafilaturaMcpUrl}`);
    console.log("Waiting for MCP client connection via STDIO...\n");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
