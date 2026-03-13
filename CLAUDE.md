# Claude Code: Web Search CLI

Use the `web-search` CLI when you need live web search or text extraction.

## Recommended workflow

1. `web-search search "<query>" --json`
2. Pick the best URLs.
3. `web-search extract "<url>" --json`
4. If egress is blocked or rate-limited, run `web-search rotate --json`

## Environment

Set this if you are not using the default public API:

```bash
export WEB_SEARCH_API_URL="https://web-search.oremuslabs.app"
```
