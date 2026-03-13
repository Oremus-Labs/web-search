import { runCli } from "../src/cli.ts";

async function main() {
  const apiBaseUrl = process.env.WEB_SEARCH_API_URL;
  if (!apiBaseUrl) {
    throw new Error("Set WEB_SEARCH_API_URL before running smoke test");
  }

  const searchCode = await runCli(["search", "example domain", "--json"], {
    env: process.env as Record<string, string>,
  });
  if (searchCode !== 0) {
    throw new Error(`search smoke failed with exit code ${searchCode}`);
  }

  const extractCode = await runCli(["extract", "https://example.com", "--json", "--no-proxy"], {
    env: process.env as Record<string, string>,
  });
  if (extractCode !== 0) {
    throw new Error(`extract smoke failed with exit code ${extractCode}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
