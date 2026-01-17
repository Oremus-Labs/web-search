export type AppConfig = {
  searxngUrl: string;
  searxngUserAgent: string;
  trafilaturaMcpUrl: string;
  trafilaturaBearerToken?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const searxngUrl = (env.SEARXNG_URL || "").trim();
  const trafilaturaMcpUrl = (env.TRAFILATURA_MCP_URL || "").trim();

  if (!searxngUrl) {
    throw new Error("Missing required env var: SEARXNG_URL");
  }
  if (!trafilaturaMcpUrl) {
    throw new Error("Missing required env var: TRAFILATURA_MCP_URL");
  }

  return {
    searxngUrl,
    searxngUserAgent: (env.USER_AGENT || "web-search-mcp").trim(),
    trafilaturaMcpUrl,
    trafilaturaBearerToken: (env.TRAFILATURA_BEARER_TOKEN || "").trim() || undefined,
  };
}

export function normalizeSearxngSearchEndpoint(searxngUrl: string): string {
  const trimmed = searxngUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/search")) {
    return trimmed;
  }
  return `${trimmed}/search`;
}

