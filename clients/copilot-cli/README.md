# Copilot CLI setup

GitHub Copilot CLI support for MCP varies by environment.

- If your Copilot environment supports MCP, configure it to run `npx -y oremus-web-search` and provide `SEARXNG_URL` + `TRAFILATURA_MCP_URL`.
- If it does not, use `.github/copilot-instructions.md` as the canonical “web search + extraction” playbook and ensure your workflow uses MCP-capable tooling (Codex CLI / Claude Code) for retrieval tasks.

