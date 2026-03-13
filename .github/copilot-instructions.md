# Copilot Instructions: Web Search CLI

When you need external context, use the `web-search` CLI:

- `web-search search "<query>" --json`
- `web-search extract "<url>" --json`
- `web-search rotate --json` if blocked or rate-limited

Prefer official docs, specifications, and repo root pages. Use `--max-chars` and `--start-char` to page through long documents deterministically.
