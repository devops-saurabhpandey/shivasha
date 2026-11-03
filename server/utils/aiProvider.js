/**
 * SHIVASHA AI provider adapter.
 * Supports OpenAI-compatible inference servers (including self-hosted runtimes).
 * Set AI_BASE_URL to the provider's /v1 base URL, AI_MODEL to its model name,
 * and AI_API_KEY if the endpoint requires a key. No key is required for local
 * endpoints that do not enforce authentication.
 */
export function getAIProviderConfig() {
  const baseURL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  return { baseURL, apiKey, model, provider: process.env.AI_BASE_URL ? "custom" : "openai-compatible" };
}

export async function requestChatCompletion(payload, { timeoutMs = 45_000 } = {}) {
  const config = getAIProviderConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = "Bearer " + config.apiKey;
  const response = await fetch(config.baseURL + "/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, model: payload.model || config.model }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data, model: config.model, provider: config.provider };
}
