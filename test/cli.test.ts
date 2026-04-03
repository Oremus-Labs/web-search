import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { formatExtractText, runCli } from "../src/cli.js";

test("loadConfig defaults to the public REST API", () => {
  const config = loadConfig({});

  assert.equal(config.apiBaseUrl, "https://web-search.oremuslabs.app");
  assert.equal(config.userAgent, "web-search");
});

test("package metadata uses the renamed scoped package identity", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    name: string;
    repository: { url: string };
    homepage: string;
    bugs: { url: string };
    publishConfig: { access: string };
    bin: Record<string, string>;
  };

  assert.equal(pkg.name, "@oremus-labs/web-search");
  assert.equal(pkg.repository.url, "git+ssh://git@github.com/Oremus-Labs/web-search.git");
  assert.equal(pkg.homepage, "https://github.com/Oremus-Labs/web-search");
  assert.equal(pkg.bugs.url, "https://github.com/Oremus-Labs/web-search/issues");
  assert.equal(pkg.publishConfig.access, "public");
  assert.deepEqual(pkg.bin, { "web-search": "dist/index.js" });
});

test("runCli search uses the REST API and prints normalized JSON", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  const logs: string[] = [];
  const originalLog = console.log;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        ok: true,
        query: "vatican",
        page: 1,
        results: [{ title: "Vatican", url: "https://example.com", snippet: "example", score: 1 }],
        infoboxes: [],
        unresponsive_engines: [],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  }) as typeof fetch;
  console.log = (message?: unknown) => {
    logs.push(String(message ?? ""));
  };

  try {
    const exitCode = await runCli(["search", "vatican", "--json"], { env: {} });
    assert.equal(exitCode, 0);
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /https:\/\/web-search\.oremuslabs\.app\/v1\/search\?/);
    assert.match(calls[0]!.url, /query=vatican/);
    assert.deepEqual(JSON.parse(logs[0] ?? "{}"), {
      ok: true,
      query: "vatican",
      page: 1,
      results: [{ title: "Vatican", url: "https://example.com", snippet: "example", score: 1 }],
      infoboxes: [],
      unresponsive_engines: [],
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
});

test("formatExtractText renders normalized extraction data for humans", () => {
  const output = formatExtractText({
    ok: true,
    url: "https://example.com",
    original_url: "https://example.com",
    final_url: "https://example.com",
    text: "Example body",
    raw_text: "Example body",
    comments: "",
    metadata: { title: "Example title", sitename: "Example Site" },
    content_type: "text/html",
    slice: { text: { start_char: 0, max_chars: 100, truncated: false } },
    fetch: { status: 200, attempt: 1, proxy: null, download_truncated: false, headers: {} },
  });

  assert.match(output, /Example title/);
  assert.match(output, /Example Site/);
  assert.match(output, /Example body/);
});
