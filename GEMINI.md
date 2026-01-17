# Gemini CLI / Gemini Code Assist: Web Search (oremus-web-search)

If your Gemini environment supports launching MCP servers (stdio) and calling tools, configure and use:

- `web_search` for discovery (returns formatted text results).
- `fetch_and_extract` for clean extraction (returns JSON as a text blob).
- `rotate_vpn` when blocked/rate-limited.

## Recommended usage patterns

- Prefer official docs/specs and GitHub repo root pages.
- Use `max_chars` + `start_char` to page through long pages deterministically.
- Use `rewrite_github_blob_to_raw=true` for GitHub `.../blob/...` links.
- Use `plain_text_fallback=true` for raw text endpoints.

If Gemini CLI doesn’t support MCP directly, copy/paste these rules into your “custom instructions” so the agent consistently uses the MCP server when it’s available.

