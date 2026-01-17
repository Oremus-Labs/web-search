type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
};

type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type ToolCallResult = {
  content: Array<{ type: "text"; text: string } | { type: string; [k: string]: unknown }>;
  isError?: boolean;
};

function contentTypeBase(value: string | null): string {
  if (!value) return "";
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

async function readAllText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

function parseSseMessages(sseText: string): string[] {
  const events = sseText.split(/\r?\n\r?\n/).map((e) => e.trim()).filter(Boolean);
  const messages: string[] = [];
  for (const event of events) {
    const lines = event.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.slice("data:".length).trim();
        if (data) messages.push(data);
      }
    }
  }
  return messages;
}

export class StreamableHttpMcpClient {
  private readonly url: string;
  private readonly authorization?: string;
  private sessionId?: string;
  private protocolVersion?: string;
  private nextId = 1;
  private initializing?: Promise<void>;

  constructor(options: { url: string; bearerToken?: string }) {
    this.url = options.url;
    this.authorization = options.bearerToken ? `Bearer ${options.bearerToken}` : undefined;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(extra ?? {}),
    };
    if (this.authorization) headers.Authorization = this.authorization;
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    if (this.protocolVersion) headers["mcp-protocol-version"] = this.protocolVersion;
    return headers;
  }

  private async post(message: JsonRpcRequest | JsonRpcNotification): Promise<JsonRpcResponse | null> {
    const resp = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(message),
    });

    const newSessionId = resp.headers.get("mcp-session-id");
    if (newSessionId) this.sessionId = newSessionId;

    const ct = contentTypeBase(resp.headers.get("content-type"));

    if (resp.status >= 400) {
      const body = await resp.text().catch(() => "");
      throw new Error(`MCP HTTP ${resp.status}: ${body.slice(0, 500)}`);
    }

    // Notifications often return 202 with no body.
    if (!("id" in message)) {
      return null;
    }

    if (ct === "application/json") {
      return (await resp.json()) as JsonRpcResponse;
    }

    if (ct === "text/event-stream") {
      const sseText = await readAllText(resp.body);
      const datas = parseSseMessages(sseText);
      for (const data of datas) {
        try {
          const parsed = JSON.parse(data) as JsonRpcResponse;
          if (parsed && parsed.id === message.id) {
            return parsed;
          }
        } catch {
          // ignore malformed lines
        }
      }
      throw new Error("MCP SSE response did not include a matching JSON-RPC response");
    }

    const body = await resp.text().catch(() => "");
    throw new Error(`Unexpected MCP response content-type '${ct}': ${body.slice(0, 200)}`);
  }

  async ensureInitialized(): Promise<void> {
    if (this.initializing) return this.initializing;
    if (this.sessionId && this.protocolVersion) return;

    this.initializing = (async () => {
      const initId = this.nextId++;
      const initReq: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: initId,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "oremus-web-search", version: "0.1.3" },
        },
      };
      const initResp = await this.post(initReq);
      if (!initResp) throw new Error("Initialize returned no response");
      if (initResp.error) throw new Error(`Initialize error: ${initResp.error.message}`);

      const result = initResp.result as any;
      const negotiated = result?.protocolVersion;
      if (typeof negotiated === "string") this.protocolVersion = negotiated;

      const initialized: JsonRpcNotification = {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {},
      };
      await this.post(initialized);
    })().finally(() => {
      this.initializing = undefined;
    });

    return this.initializing;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    await this.ensureInitialized();

    const id = this.nextId++;
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    };
    const resp = await this.post(req);
    if (!resp) throw new Error("tools/call returned no response");
    if (resp.error) throw new Error(`tools/call error: ${resp.error.message}`);
    return resp.result as ToolCallResult;
  }
}
