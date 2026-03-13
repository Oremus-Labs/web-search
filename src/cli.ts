import { loadConfig, type AppConfig } from "./config.js";

type EnvLike = Record<string, string | undefined>;

type SearchResponse = {
  ok: boolean;
  query: string;
  page: number;
  results: Array<{
    title: string;
    url: string;
    snippet?: string;
    score?: number;
    engines?: string[];
    published_date?: string | null;
  }>;
  infoboxes: unknown[];
  unresponsive_engines: unknown[];
};

type ExtractResponse = {
  ok: boolean;
  url: string;
  original_url: string;
  final_url: string;
  text?: string | null;
  raw_text?: string | null;
  comments?: string | null;
  metadata: Record<string, unknown>;
  content_type?: string | null;
  slice?: Record<string, unknown>;
  fetch?: Record<string, unknown>;
};

type RotateResponse = {
  ok: boolean;
  rotated: Record<
    string,
    {
      before_city?: string | null;
      after_city?: string | null;
      success: boolean;
      changed: boolean;
      error?: string;
    }
  >;
  pool_swapped?: boolean;
  pool_hosts?: string[];
  ts?: number;
};

type ErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === false &&
    "error" in value
  );
}

type CliOptions = {
  env?: EnvLike;
  fetchImpl?: typeof fetch;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
};

function readFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatSearchText(response: SearchResponse): string {
  if (!response.results.length) return "No results.";

  return response.results
    .map((result, index) => {
      const lines = [
        `${index + 1}. ${result.title}`,
        `URL: ${result.url}`,
        `Snippet: ${result.snippet ?? ""}`,
      ];
      if (typeof result.score === "number") lines.push(`Score: ${result.score}`);
      if (result.engines?.length) lines.push(`Engines: ${result.engines.join(", ")}`);
      if (result.published_date) lines.push(`Published: ${result.published_date}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatExtractText(response: ExtractResponse): string {
  const metadata = response.metadata ?? {};
  const lines = [
    `URL: ${response.url}`,
    metadata.title ? `Title: ${String(metadata.title)}` : undefined,
    metadata.sitename ? `Site: ${String(metadata.sitename)}` : undefined,
    response.content_type ? `Content-Type: ${response.content_type}` : undefined,
    "",
    response.text || response.raw_text || "",
  ];
  return lines.filter((line) => line !== undefined).join("\n");
}

function formatRotateText(response: RotateResponse): string {
  const lines = [`Rotation OK: ${response.ok ? "yes" : "no"}`];
  for (const [host, result] of Object.entries(response.rotated ?? {})) {
    lines.push(
      `${host}: ${result.success ? "success" : "failure"} (before=${result.before_city ?? "-"}, after=${result.after_city ?? "-"})`
    );
  }
  if (response.pool_hosts?.length) {
    lines.push(`Active pool: ${response.pool_hosts.join(", ")}`);
  }
  return lines.join("\n");
}

async function apiRequest<T>(
  config: AppConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch
): Promise<T | ErrorResponse> {
  const url = new URL(path, config.apiBaseUrl);
  const resp = await fetchImpl(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": config.userAgent,
      ...(init.headers ?? {}),
    },
  });

  const body = (await resp.json()) as T | ErrorResponse;
  if (!resp.ok) {
    return body as ErrorResponse;
  }
  return body;
}

function usage(): string {
  return [
    "Usage:",
    "  web-search search <query> [--json] [--pageno N] [--time-range day|month|year] [--language CODE] [--safesearch 0|1|2]",
    "  web-search extract <url> [--json] [--include-comments] [--include-tables] [--no-proxy] [--max-chars N] [--start-char N]",
    "  web-search rotate [--json]",
  ].join("\n");
}

export async function runCli(argv: string[], options: CliOptions = {}): Promise<number> {
  const config = loadConfig(options.env ?? process.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const stdout = options.stdout ?? ((message: string) => console.log(message));
  const stderr = options.stderr ?? ((message: string) => console.error(message));

  const [command, ...args] = argv;
  if (!command || hasFlag(args, "--help") || command === "--help") {
    stdout(usage());
    return 0;
  }

  const wantJson = hasFlag(args, "--json");

  if (command === "search") {
    const query = args.find((arg) => !arg.startsWith("--"));
    if (!query) {
      stderr("search requires a query");
      return 1;
    }
    const url = new URL("/v1/search", config.apiBaseUrl);
    url.searchParams.set("query", query);
    const pageno = readFlag(args, "--pageno");
    const timeRange = readFlag(args, "--time-range");
    const language = readFlag(args, "--language");
    const safesearch = readFlag(args, "--safesearch");
    if (pageno) url.searchParams.set("pageno", pageno);
    if (timeRange) url.searchParams.set("time_range", timeRange);
    if (language) url.searchParams.set("language", language);
    if (safesearch) url.searchParams.set("safesearch", safesearch);
    const response = await apiRequest<SearchResponse>(config, url.toString(), { method: "GET" }, fetchImpl);
    if (isErrorResponse(response)) {
      stderr(`${response.error.code}: ${response.error.message}`);
      return 1;
    }
    stdout(wantJson ? formatJson(response) : formatSearchText(response));
    return 0;
  }

  if (command === "extract") {
    const url = args.find((arg) => !arg.startsWith("--"));
    if (!url) {
      stderr("extract requires a URL");
      return 1;
    }
    const payload = {
      url,
      include_comments: hasFlag(args, "--include-comments"),
      include_tables: hasFlag(args, "--include-tables"),
      use_proxy: !hasFlag(args, "--no-proxy"),
      max_chars: readFlag(args, "--max-chars") ? Number(readFlag(args, "--max-chars")) : undefined,
      start_char: readFlag(args, "--start-char") ? Number(readFlag(args, "--start-char")) : undefined,
      max_fetch_bytes: readFlag(args, "--max-fetch-bytes") ? Number(readFlag(args, "--max-fetch-bytes")) : undefined,
      fetch_timeout_seconds: readFlag(args, "--fetch-timeout-seconds")
        ? Number(readFlag(args, "--fetch-timeout-seconds"))
        : undefined,
      user_agent: readFlag(args, "--user-agent"),
      accept_language: readFlag(args, "--accept-language"),
      plain_text_fallback: hasFlag(args, "--plain-text-fallback"),
      rewrite_github_blob_to_raw: !hasFlag(args, "--no-rewrite-github-blob-to-raw"),
      max_total_seconds: readFlag(args, "--max-total-seconds") ? Number(readFlag(args, "--max-total-seconds")) : undefined,
    };
    const response = await apiRequest<ExtractResponse>(
      config,
      "/v1/extract",
      { method: "POST", body: JSON.stringify(payload) },
      fetchImpl
    );
    if (isErrorResponse(response)) {
      stderr(`${response.error.code}: ${response.error.message}`);
      return 1;
    }
    stdout(wantJson ? formatJson(response) : formatExtractText(response));
    return 0;
  }

  if (command === "rotate") {
    const response = await apiRequest<RotateResponse>(
      config,
      "/v1/rotate",
      { method: "POST", body: "{}" },
      fetchImpl
    );
    if (isErrorResponse(response)) {
      stderr(`${response.error.code}: ${response.error.message}`);
      return 1;
    }
    stdout(wantJson ? formatJson(response) : formatRotateText(response));
    return 0;
  }

  stderr(`unknown command: ${command}`);
  stderr(usage());
  return 1;
}
