import { StreamableHttpMcpClient } from "../src/streamableHttpMcpClient.ts";

type FetchStep = {
  expectMethod: string;
  status: number;
  body: string;
  headers?: Record<string, string>;
  expectSessionId?: string;
};

function sseMessage(payload: unknown): string {
  return `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
}

function installMockFetch(steps: FetchStep[]): () => void {
  const originalFetch = globalThis.fetch;
  let idx = 0;

  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    if (idx >= steps.length) {
      throw new Error(`Unexpected fetch call #${idx + 1}`);
    }
    const step = steps[idx++];
    const headers = new Headers(init?.headers);
    const sessionId = headers.get("mcp-session-id") ?? undefined;

    const rawBody = typeof init?.body === "string" ? init.body : "";
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    const actualMethod = parsed?.method;

    if (actualMethod !== step.expectMethod) {
      throw new Error(`Step ${idx}: expected method '${step.expectMethod}' but got '${actualMethod}'`);
    }
    if (step.expectSessionId !== undefined && sessionId !== step.expectSessionId) {
      throw new Error(
        `Step ${idx}: expected session '${step.expectSessionId}' but got '${sessionId ?? "<none>"}'`
      );
    }

    return new Response(step.body, {
      status: step.status,
      headers: step.headers,
    });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function testSessionRecovery404(): Promise<void> {
  const restore = installMockFetch([
    {
      expectMethod: "initialize",
      status: 200,
      body: sseMessage({
        jsonrpc: "2.0",
        id: 1,
        result: { protocolVersion: "2025-03-26", capabilities: {} },
      }),
      headers: { "content-type": "text/event-stream", "mcp-session-id": "s1" },
    },
    {
      expectMethod: "notifications/initialized",
      status: 202,
      body: "",
      headers: { "content-type": "application/json", "mcp-session-id": "s1" },
      expectSessionId: "s1",
    },
    {
      expectMethod: "tools/call",
      status: 404,
      body: '{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}',
      headers: { "content-type": "application/json", "mcp-session-id": "s1" },
      expectSessionId: "s1",
    },
    {
      expectMethod: "initialize",
      status: 200,
      body: sseMessage({
        jsonrpc: "2.0",
        id: 3,
        result: { protocolVersion: "2025-03-26", capabilities: {} },
      }),
      headers: { "content-type": "text/event-stream", "mcp-session-id": "s2" },
    },
    {
      expectMethod: "notifications/initialized",
      status: 202,
      body: "",
      headers: { "content-type": "application/json", "mcp-session-id": "s2" },
      expectSessionId: "s2",
    },
    {
      expectMethod: "tools/call",
      status: 200,
      body: sseMessage({
        jsonrpc: "2.0",
        id: 4,
        result: { content: [{ type: "text", text: "ok" }] },
      }),
      headers: { "content-type": "text/event-stream", "mcp-session-id": "s2" },
      expectSessionId: "s2",
    },
  ]);

  try {
    const client = new StreamableHttpMcpClient({ url: "https://example.invalid/mcp" });
    const result = await client.callTool("fetch_and_extract", { url: "https://example.com" });
    const text = result.content?.[0] && "text" in result.content[0] ? result.content[0].text : "";
    if (text !== "ok") {
      throw new Error(`Expected recovered call result "ok", got "${text}"`);
    }
  } finally {
    restore();
  }
}

async function testNoInfiniteRetryOn500(): Promise<void> {
  let calls = 0;
  const restore = installMockFetch([
    {
      expectMethod: "initialize",
      status: 200,
      body: sseMessage({
        jsonrpc: "2.0",
        id: 1,
        result: { protocolVersion: "2025-03-26", capabilities: {} },
      }),
      headers: { "content-type": "text/event-stream", "mcp-session-id": "s1" },
    },
    {
      expectMethod: "notifications/initialized",
      status: 202,
      body: "",
      headers: { "content-type": "application/json", "mcp-session-id": "s1" },
      expectSessionId: "s1",
    },
    {
      expectMethod: "tools/call",
      status: 500,
      body: "internal server error",
      headers: { "content-type": "text/plain", "mcp-session-id": "s1" },
      expectSessionId: "s1",
    },
  ]);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls += 1;
    return originalFetch(input, init);
  }) as typeof fetch;

  try {
    const client = new StreamableHttpMcpClient({ url: "https://example.invalid/mcp" });
    let sawFailure = false;
    try {
      await client.callTool("fetch_and_extract", { url: "https://example.com" });
    } catch {
      sawFailure = true;
    }
    if (!sawFailure) {
      throw new Error("Expected non-session 500 error to fail");
    }
    if (calls !== 3) {
      throw new Error(`Expected exactly 3 fetch calls (init + initialized + tools/call), got ${calls}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
}

async function main(): Promise<void> {
  await testSessionRecovery404();
  await testNoInfiniteRetryOn500();
  console.log("session recovery smoke tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
