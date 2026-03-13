# oremus-web-search

`web-search` is the preferred Unix-style CLI for the Oremus web search REST API.
The package name remains `oremus-web-search`.

It talks to:
- `https://web-search.oremuslabs.app` for API requests
- `https://search.oremuslabs.app` indirectly through the API for SearXNG-backed search

The CLI exposes three commands:
- `search` for SearXNG-backed web results
- `extract` for Trafilatura-backed page extraction
- `rotate` for manual VPN/proxy rotation

## Install

### GitHub Release tarball

```bash
npx -y https://github.com/Oremus-Labs/web-search-mcp/releases/latest/download/web-search-mcp.tgz search "vatican"
```

### npm

```bash
npx -y oremus-web-search@0.1.6 search "vatican"
```

## Configuration

Optional environment variables:

- `WEB_SEARCH_API_URL`
  - Defaults to `https://web-search.oremuslabs.app`
- `USER_AGENT`
  - Preferred command: `web-search`
  - Also available as `oremus-web-search`

## Commands

### `search`

```bash
web-search search "vatican" --json
web-search search "site:docs.python.org asyncio" --language en --time-range year
```

Flags:
- `--json`
- `--pageno <n>`
- `--time-range day|month|year`
- `--language <code>`
- `--safesearch 0|1|2`

### `extract`

```bash
web-search extract "https://example.com/article" --json
web-search extract "https://github.com/org/repo/blob/main/README.md" --max-chars 4000 --start-char 0
```

Flags:
- `--json`
- `--include-comments`
- `--include-tables`
- `--no-proxy`
- `--max-chars <n>`
- `--start-char <n>`
- `--max-fetch-bytes <n>`
- `--fetch-timeout-seconds <n>`
- `--user-agent <value>`
- `--accept-language <value>`
- `--plain-text-fallback`
- `--no-rewrite-github-blob-to-raw`
- `--max-total-seconds <n>`

### `rotate`

```bash
web-search rotate --json
```

## Local development

```bash
cd web-search-mcp
npm install
npm test
npm run build
WEB_SEARCH_API_URL="http://127.0.0.1:18090" npm run smoke
```

## Local cluster access

Port-forward the in-cluster API if you do not want to use the public hostname:

```bash
kubectl -n searxng port-forward svc/searxng-web-search-api 18090:8090
WEB_SEARCH_API_URL="http://127.0.0.1:18090" web-search search "example domain"
```

## Notes

- This repo no longer provides an MCP server.
- The Kubernetes-side MCP endpoint and MCP session recovery logic were replaced by a plain REST API.
