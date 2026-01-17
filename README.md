# web-search-mcp

An MCP server that exposes:

- `web_search`: web search via a configurable SearXNG instance (JSON API).
- `fetch_and_extract`: main-content extraction via a configurable Trafilatura MCP server (Streamable HTTP).
- `rotate_vpn`: asks Trafilatura to rotate its VPN/proxy egress.

This is designed to be run with `npx` as an MCP server (stdio transport).

## Why this exists

- SearXNG is great for finding URLs.
- Trafilatura is great at extracting clean article text and metadata.
- This server provides a single MCP endpoint that combines both.

## Install / Run

### Option A (recommended): no-token install via GitHub Release tarball

This avoids GitHub Packages auth requirements and “just works” with `npx`:

```bash
SEARXNG_URL="https://search.oremuslabs.app" \\
TRAFILATURA_MCP_URL="https://trafilatura.oremuslabs.app/mcp" \\
npx -y https://github.com/Oremus-Labs/web-search-mcp/releases/latest/download/web-search-mcp.tgz
```

If you want a pinned version, use the versioned asset under the tag, e.g.:

```bash
npx -y https://github.com/Oremus-Labs/web-search-mcp/releases/download/v0.1.1/oremus-labs-web-search-mcp-0.1.1.tgz
```

### Option B: GitHub Packages

GitHub Packages’ npm registry typically requires authentication (`read:packages`) to install.

## Configuration

Required environment variables:

- `SEARXNG_URL`
  - Base URL for your SearXNG instance.
  - The server calls `${SEARXNG_URL}/search?format=json&...`.
  - You may also set `SEARXNG_URL` to the full `/search` endpoint.
- `TRAFILATURA_MCP_URL`
  - Full MCP endpoint URL for Trafilatura (must include the MCP path), e.g. `http://...:8090/mcp`.

Optional environment variables:

- `USER_AGENT` (default: `web-search-mcp`)
- `TRAFILATURA_BEARER_TOKEN` (adds `Authorization: Bearer ...` when calling Trafilatura MCP)

## Tools

### `web_search`

Input (matches the common SearXNG MCP shape):

- `query` (string, required)
- `pageno` (number, optional)
- `time_range` (`day|month|year`, optional)
- `language` (string, optional)
- `safesearch` (`0|1|2`, optional)

Output:

- A single `text` block formatted as:
  - `Title: ...`
  - `Description: ...`
  - `URL: ...`
  - `Relevance Score: ...`

### `fetch_and_extract`

Input:

- `url` (string, required)
- `include_comments` (boolean, optional)
- `include_tables` (boolean, optional)
- `use_proxy` (boolean, optional)

Output:

- Pass-through of the Trafilatura MCP server tool result (typically a single `text` block containing JSON).

### `rotate_vpn`

Input:

- none

Output:

- Pass-through of the Trafilatura MCP server tool result.

Notes:

- This tool is intentionally exposed through Trafilatura (in-cluster) so you don't need to expose a public REST endpoint for VPN rotation.
- Rotation is disruptive to in-flight requests; only call it when you’re getting blocked/rate-limited.

## Local development

```bash
cd web-search-mcp
npm install
npm run build
SEARXNG_URL="http://127.0.0.1:18080" TRAFILATURA_MCP_URL="http://127.0.0.1:18090/mcp" npm run inspector
```

## Kubernetes access (typical)

If your Trafilatura MCP server is only exposed as an in-cluster Service, run it through a port-forward:

```bash
kubectl -n searxng port-forward svc/searxng-trafilatura-mcp 18090:8090
```

Then set:

- `TRAFILATURA_MCP_URL=http://127.0.0.1:18090/mcp`

## Use in Codex CLI

Add a server entry to `~/.codex/config.toml`:

```toml
[mcp_servers.web_search]
command = "npx"
args = ["-y", "https://github.com/Oremus-Labs/web-search-mcp/releases/latest/download/web-search-mcp.tgz"]
env = { "SEARXNG_URL" = "https://search.oremuslabs.app", "TRAFILATURA_MCP_URL" = "https://trafilatura.oremuslabs.app/mcp" }
startup_timeout_sec = 30
tool_timeout_sec = 120
```

Restart Codex CLI after editing.

## Use in Claude Code

Add a server entry to your Claude Code MCP config (commonly `.mcp.json` in your project root, or wherever you keep your Claude configuration):

```json
{
  "mcpServers": {
    "web-search": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/Oremus-Labs/web-search-mcp/releases/latest/download/web-search-mcp.tgz"
      ],
      "env": {
        "SEARXNG_URL": "https://search.oremuslabs.app",
        "TRAFILATURA_MCP_URL": "https://trafilatura.oremuslabs.app/mcp"
      }
    }
  }
}
```

## Notes

- This server uses stdio transport (default) so it works with MCP clients that launch subprocesses.
- Trafilatura is called through its MCP Streamable HTTP endpoint; this repo’s Kubernetes deployment exposes it as `svc/searxng-trafilatura-mcp` in namespace `searxng`.
