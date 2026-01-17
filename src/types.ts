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
    },
    required: ["url"],
  },
};

