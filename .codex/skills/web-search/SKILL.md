---
name: web-search
description: "Web research skill powered by the `oremus-web-search` MCP server (SearXNG search + Trafilatura extraction + VPN rotation)."
compatibility: "Requires MCP server exposing tools: web_search, fetch_and_extract, rotate_vpn."
metadata:
  author: "Oremus-Labs"
  version: "0.1.0"
---

# Web Search Skill (oremus-web-search)

## What this skill is for
Use this skill when you need to:
- Find relevant sources (repos, docs, specs, blog posts) quickly.
- Extract clean, LLM-friendly text from those sources.
- Recover from rate-limits by rotating egress when needed.

## Tools (exact)
- `web_search({ query, pageno?, time_range?, language?, safesearch? })`
  - Returns a formatted text block (not JSON). Parse it into `{title, description, url, score}`.
- `fetch_and_extract({ url, ...options })`
  - Returns a JSON object serialized as a single text block.
- `rotate_vpn({})`
  - Rotates the Trafilatura service egress (useful when blocked/rate-limited).

## Default workflow

### 1) Search, then shortlist
1) Run 3–6 `web_search` queries (baseline + synonyms + authoritative sources).
2) Parse results, de-duplicate by URL, shortlist 3–7 URLs max.
3) Prefer:
   - Official docs/specs
   - Primary source repos (GitHub repo root pages)
   - Maintainer blogs / release notes

### 2) Extract with fetch_and_extract
Call `fetch_and_extract` for each shortlisted URL to get clean main text.

Recommended defaults:
- `use_proxy=false` for normal docs, flip to `true` if blocked/slow.
- `include_tables=true` for API/reference pages with important tables.

### 3) Control size + page through big docs
For very large pages (API refs, package indexes), avoid dumping huge text:
- Use `max_chars` to cap output size.
- Use `start_char` to page through content deterministically.

Example:
```json
{"url":"https://pkg.go.dev/net/http","max_chars":2000,"start_char":0}
```

### 4) GitHub-specific guidance
GitHub pages behave differently:

- Prefer repo root: `https://github.com/org/repo`
  - Usually extracts README-like content well.
- Avoid blob pages: `https://github.com/org/repo/blob/...`
  - These often extract a short “error while loading” stub due to dynamic rendering.
- If you do have a blob URL, enable rewriting:
  - `rewrite_github_blob_to_raw=true`
  - This rewrites to `raw.githubusercontent.com/...` before fetching.

### 5) Plain-text / raw content
If the target is `text/plain` and extraction is empty:
- Set `plain_text_fallback=true` to return the raw body as `text`.

This is useful for raw READMEs, raw changelogs, or simple text endpoints.

### 6) Timeouts and fetch limits
If you see timeouts or slow responses:
- `fetch_timeout_seconds`: cap per-attempt fetch time.
- `max_total_seconds`: best-effort overall time budget.
- `max_fetch_bytes`: cap download size (may truncate HTML, but keeps calls bounded).

## Rate-limit recovery
If you hit repeated 429/403/captcha behavior:
1) Call `rotate_vpn({})`.
2) Retry the failed `web_search` / `fetch_and_extract`.

Only rotate when needed; it can disrupt in-flight requests.

## Practical recipes (coding + research)

### Repo discovery → docs extraction
1) `web_search({ "query": "model context protocol typescript sdk github", "safesearch": "0" })`
2) Extract the repo root and the docs/spec page:
   - `fetch_and_extract({ "url": "https://github.com/modelcontextprotocol/typescript-sdk", "max_chars": 6000 })`
   - `fetch_and_extract({ "url": "https://modelcontextprotocol.io/specification/2025-03-26/basic/transports", "max_chars": 8000 })`

### API reference (keep it bounded)
`fetch_and_extract({ "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise", "max_chars": 4000, "include_tables": false, "use_proxy": true })`

