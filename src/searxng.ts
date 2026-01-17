import { normalizeSearxngSearchEndpoint } from "./config.js";
import type { WebSearchArgs } from "./types.js";

type SearxngResult = {
  title?: string;
  content?: string;
  url?: string;
  score?: number;
};

type SearxngResponse = {
  results?: SearxngResult[];
};

function formatResults(results: SearxngResult[]): string {
  return results
    .map((r) => {
      const title = r.title ?? "";
      const description = r.content ?? "";
      const url = r.url ?? "";
      const score =
        typeof r.score === "number" ? r.score.toFixed(3) : r.score ?? "";
      return [
        `Title: ${title}`,
        `Description: ${description}`,
        `URL: ${url}`,
        `Relevance Score: ${score}`,
      ].join("\n");
    })
    .join("\n\n");
}

export async function webSearch(
  searxngUrl: string,
  userAgent: string,
  args: WebSearchArgs
): Promise<string> {
  const endpoint = normalizeSearxngSearchEndpoint(searxngUrl);
  const url = new URL(endpoint);
  url.searchParams.set("q", args.query);
  url.searchParams.set("format", "json");

  if (args.pageno !== undefined) url.searchParams.set("pageno", String(args.pageno));
  if (args.time_range) url.searchParams.set("time_range", args.time_range);
  if (args.language) url.searchParams.set("language", args.language);
  if (args.safesearch) url.searchParams.set("safesearch", args.safesearch);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`SearXNG HTTP ${resp.status}: ${text.slice(0, 500)}`);
  }

  const data = (await resp.json()) as SearxngResponse;
  const results = data.results ?? [];

  if (!results.length) {
    return "No results.";
  }

  return formatResults(results);
}

