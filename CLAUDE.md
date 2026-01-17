# Claude Code: Web Search Skill (oremus-web-search)

This project is designed to be used with the `oremus-web-search` MCP server.

## When to use it
- Find authoritative sources quickly (docs/specs/repos).
- Extract clean main text from pages for reasoning/summarization.
- Rotate egress when blocked/rate-limited.

## Recommended workflow
1) `web_search` → shortlist URLs (prefer official docs/specs and GitHub repo root pages).
2) `fetch_and_extract` each shortlisted URL:
   - Use `max_chars` + `start_char` to keep output bounded and “page” through large docs.
   - Use `rewrite_github_blob_to_raw=true` if you receive a GitHub `.../blob/...` URL.
   - Use `plain_text_fallback=true` for raw text endpoints (e.g., `raw.githubusercontent.com/...`).
3) If you hit 429/403/captcha, call `rotate_vpn({})` and retry once.

## Claude Code MCP config example
Create/update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "web-search": {
      "command": "npx",
      "args": ["-y", "oremus-web-search"],
      "env": {
        "SEARXNG_URL": "https://search.oremuslabs.app",
        "TRAFILATURA_MCP_URL": "https://trafilatura.oremuslabs.app/mcp"
      }
    }
  }
}
```

