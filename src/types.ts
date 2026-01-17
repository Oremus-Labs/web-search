import { Tool } from "@modelcontextprotocol/sdk/types.js";

export type WebSearchArgs = {
  query: string;
  pageno?: number;
  time_range?: "day" | "month" | "year";
  language?: string;
  safesearch?: "0" | "1" | "2";
};

export function isWebSearchArgs(args: unknown): args is WebSearchArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

export const WEB_SEARCH_TOOL: Tool = {
  name: "web_search",
  description:
    "Performs a web search using a SearXNG instance. Returns a formatted text block similar to `searxng_web_search`.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query.",
      },
      pageno: {
        type: "number",
        description: "Search page number (starts at 1).",
        default: 1,
      },
      time_range: {
        type: "string",
        description: "Time range of search (day, month, year).",
        enum: ["day", "month", "year"],
      },
      language: {
        type: "string",
        description:
          "Language code for search results (e.g., 'en', 'fr', 'de'). Default is instance-dependent.",
        default: "all",
      },
      safesearch: {
        type: "string",
        description: "Safe search filter level (0: None, 1: Moderate, 2: Strict).",
        enum: ["0", "1", "2"],
        default: "0",
      },
    },
    required: ["query"],
  },
};

export type FetchAndExtractArgs = {
  url: string;
  include_comments?: boolean;
  include_tables?: boolean;
  use_proxy?: boolean;
  max_chars?: number;
  start_char?: number;
  max_fetch_bytes?: number;
  fetch_timeout_seconds?: number;
  user_agent?: string;
  accept_language?: string;
  plain_text_fallback?: boolean;
  rewrite_github_blob_to_raw?: boolean;
  max_total_seconds?: number;
};

export function isFetchAndExtractArgs(args: unknown): args is FetchAndExtractArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "url" in args &&
    typeof (args as { url: string }).url === "string"
  );
}

export const FETCH_AND_EXTRACT_TOOL: Tool = {
  name: "fetch_and_extract",
  description:
    "Fetches a URL and extracts the main content and metadata using the configured Trafilatura MCP server.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL of the page to extract." },
      include_comments: {
        type: "boolean",
        description: "Whether to include comment sections at the bottom of articles.",
        default: false,
      },
      include_tables: {
        type: "boolean",
        description: "Extract text from HTML <table> elements.",
        default: false,
      },
      use_proxy: {
        type: "boolean",
        description: "Whether the Trafilatura service should route via its proxy pool.",
        default: true,
      },
      max_chars: {
        type: "number",
        description: "Maximum number of characters to return for extracted text fields.",
      },
      start_char: {
        type: "number",
        description: "Starting character offset for extracted text fields (used with max_chars).",
      },
      max_fetch_bytes: {
        type: "number",
        description: "Maximum number of bytes to download before extraction (may truncate HTML).",
      },
      fetch_timeout_seconds: {
        type: "number",
        description: "HTTP fetch timeout in seconds (per attempt).",
      },
      user_agent: {
        type: "string",
        description: "Override User-Agent header for the upstream fetch.",
      },
      accept_language: {
        type: "string",
        description: "Optional Accept-Language header for the upstream fetch.",
      },
      plain_text_fallback: {
        type: "boolean",
        description:
          "If the upstream is text/plain and extraction is empty, return the raw body as text.",
      },
      rewrite_github_blob_to_raw: {
        type: "boolean",
        description:
          "If the URL is a GitHub blob page, rewrite to raw.githubusercontent.com before fetching.",
      },
      max_total_seconds: {
        type: "number",
        description: "Maximum total time budget in seconds for all attempts (best-effort).",
      },
    },
    required: ["url"],
  },
};

export type RotateVpnArgs = Record<string, never>;

export function isRotateVpnArgs(args: unknown): args is RotateVpnArgs {
  return args === undefined || (typeof args === "object" && args !== null);
}

export const ROTATE_VPN_TOOL: Tool = {
  name: "rotate_vpn",
  description:
    "Requests the Trafilatura service to rotate its VPN/proxy egress (useful when rate-limited).",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};
