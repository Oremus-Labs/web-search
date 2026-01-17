# Copilot Instructions: Web Search (oremus-web-search)

When you need external context (docs/specs/repos), use the `oremus-web-search` MCP server tools:

- `web_search` to find relevant URLs.
- `fetch_and_extract` to extract clean main text.
- `rotate_vpn` if blocked/rate-limited (429/403/captcha-like behavior).

Extraction tips:

- Keep results bounded using `max_chars` and page with `start_char`.
- Prefer GitHub repo root pages over `.../blob/...` URLs.
- If you have a GitHub blob URL, set `rewrite_github_blob_to_raw=true`.
- For `text/plain` sources (raw READMEs, changelogs), set `plain_text_fallback=true`.

