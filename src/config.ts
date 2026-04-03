export type AppConfig = {
  apiBaseUrl: string;
  userAgent: string;
};

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    apiBaseUrl: normalizeApiBaseUrl((env.WEB_SEARCH_API_URL || "https://web-search.oremuslabs.app").trim()),
    userAgent: (env.USER_AGENT || "web-search").trim(),
  };
}

export function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, "");
}
