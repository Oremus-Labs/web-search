import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const searxngUrl = process.env.SEARXNG_URL;
  const trafilaturaMcpUrl = process.env.TRAFILATURA_MCP_URL;
  if (!searxngUrl || !trafilaturaMcpUrl) {
    throw new Error("Set SEARXNG_URL and TRAFILATURA_MCP_URL before running smoke test");
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: process.env as Record<string, string>,
  });

  const client = new Client({ name: "web-search-mcp-smoke", version: "0.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name).sort();
  if (
    !toolNames.includes("web_search") ||
    !toolNames.includes("fetch_and_extract") ||
    !toolNames.includes("rotate_vpn")
  ) {
    throw new Error(`Unexpected tools: ${toolNames.join(", ")}`);
  }

  const search = await client.callTool({
    name: "web_search",
    arguments: { query: "example domain", safesearch: "0" },
  });
  if (!search.content?.length) throw new Error("web_search returned no content");

  const extract = await client.callTool({
    name: "fetch_and_extract",
    arguments: { url: "https://example.com", use_proxy: false },
  });
  if (!extract.content?.length) throw new Error("fetch_and_extract returned no content");

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
