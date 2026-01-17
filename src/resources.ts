import type { AppConfig } from "./config.js";

export function createConfigResource(config: AppConfig): string {
  return JSON.stringify(
    {
      searxngUrl: config.searxngUrl,
      searxngUserAgent: config.searxngUserAgent,
      trafilaturaMcpUrl: config.trafilaturaMcpUrl,
      trafilaturaBearerTokenConfigured: Boolean(config.trafilaturaBearerToken),
    },
    null,
    2
  );
}

export function createHelpResource(): string {
  return `# web-search-mcp

This MCP server exposes two tools:

- \`web_search\` → calls the configured SearXNG instance JSON API.
- \`fetch_and_extract\` → delegates to the configured Trafilatura MCP server (Streamable HTTP).

## Required environment variables

- \`SEARXNG_URL\`: Base URL of your SearXNG instance (e.g. \`https://search.oremuslabs.app\`).
- \`TRAFILATURA_MCP_URL\`: MCP endpoint URL for Trafilatura (must include the MCP path, e.g. \`http://...:8090/mcp\`).

## Optional environment variables

- \`USER_AGENT\`: User-Agent string for SearXNG HTTP requests.
- \`TRAFILATURA_BEARER_TOKEN\`: If your Trafilatura MCP endpoint requires Authorization.
`;
}

