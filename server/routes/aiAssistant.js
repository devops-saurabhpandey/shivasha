import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requestChatCompletion, getAIProviderConfig } from "../utils/aiProvider.js";

const router = express.Router();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 12_000;
const MAX_TRACKED_RATE_LIMIT_KEYS = 10_000;
const requestWindows = new Map();

export function rateLimit(req, res, next) {
  const key = String(req.user?.id || req.ip || "unknown");
  const now = Date.now();
  let entry = requestWindows.get(key);
  if (requestWindows.size >= MAX_TRACKED_RATE_LIMIT_KEYS) {
    for (const [trackedKey, trackedEntry] of requestWindows) {
      if (now - trackedEntry.startedAt >= WINDOW_MS) requestWindows.delete(trackedKey);
    }
    if (requestWindows.size >= MAX_TRACKED_RATE_LIMIT_KEYS && !requestWindows.has(key)) {
      const oldestKey = requestWindows.keys().next().value;
      if (oldestKey !== undefined) requestWindows.delete(oldestKey);
    }
    entry = requestWindows.get(key);
  }
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    res.set("Retry-After", String(Math.ceil((WINDOW_MS - (now - entry.startedAt)) / 1000)));
    return res.status(429).json({ message: "Too many AI requests. Please wait a minute and try again." });
  }
  return next();
}

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const candidates = history.slice(-MAX_HISTORY_MESSAGES)
    .filter(item => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string")
    .map(item => ({ role: item.role, content: item.content.trim() }))
    .filter(item => item.content.length > 0);
  const bounded = [];
  let remaining = MAX_HISTORY_CHARS;
  for (let i = candidates.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const item = candidates[i];
    const content = item.content.slice(-remaining);
    bounded.unshift({ role: item.role, content });
    remaining -= content.length;
  }
  return bounded;
}

const SYSTEM_PROMPT = `You are SHIVASHA AI, a practical general-purpose assistant inside the SHIVASHA platform. Reply in the user's language (Hindi, English or Hinglish). Be clear, useful and honest. Do not claim to browse the internet or perform actions you did not perform. For medical, legal, tax or financial topics, provide general information, explain uncertainty and recommend a qualified professional for consequential decisions. Never ask for passwords, OTPs, or unnecessary sensitive personal information.`;

router.post("/chat", requireAuth, rateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ message: "Please enter a message." });
  if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ message: "Message must be 4,000 characters or fewer." });
  const config = getAIProviderConfig();
  if (!process.env.AI_BASE_URL && !config.apiKey) return res.status(503).json({
    code: "AI_NOT_CONFIGURED",
    message: "Configure AI_BASE_URL for your self-hosted model, or AI_API_KEY/OPENAI_API_KEY for a hosted provider."
  });
  const history = sanitizeHistory(req.body?.history);
  try {
    const { response: upstream, data, model, provider } = await requestChatCompletion({
      temperature: 0.3,
      max_tokens: 1200,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }]
    }, { timeoutMs: 45_000 });
    if (!upstream.ok) {
      console.error("SHIVASHA AI provider error:", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      if (upstream.status === 429) return res.status(429).json({ message: "AI service is busy or rate limited. Please try again later." });
      return res.status(502).json({ message: "Configured AI provider request failed. Check its endpoint, model and server configuration." });
    }
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ message: "AI returned an empty response. Please try again." });
    return res.json({ answer, model, provider, disclaimer: "AI-generated response; verify important information." });
  } catch (error) {
    console.error("SHIVASHA AI request failed:", error?.name || "Error");
    return res.status(502).json({ message: error?.name === "TimeoutError" ? "AI request timed out. Please try again." : "Could not reach the configured AI service. Please try again." });
  }
});

export default router;
