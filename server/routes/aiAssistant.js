import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_MESSAGE_LENGTH = 4000;
const requestWindows = new Map();

function rateLimit(req, res, next) {
  const key = String(req.user?.id || req.ip || "unknown");
  const now = Date.now();
  const entry = requestWindows.get(key);
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

const SYSTEM_PROMPT = `You are SHIVASHA AI, a practical general-purpose assistant inside the SHIVASHA platform. Reply in the user's language (Hindi, English or Hinglish). Be clear, useful and honest. Do not claim to browse the internet or perform actions you did not perform. For medical, legal, tax or financial topics, provide general information, explain uncertainty and recommend a qualified professional for consequential decisions. Never ask for passwords, OTPs, or unnecessary sensitive personal information.`;

router.post("/chat", requireAuth, rateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ message: "Please enter a message." });
  if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ message: "Message must be 4,000 characters or fewer." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ code: "AI_NOT_CONFIGURED", message: "SHIVASHA AI is not configured yet. The server administrator must add OPENAI_API_KEY to the private server environment." });

  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-8).filter(item => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string")
      .map(item => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }))
    : [];

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1200,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }]
      }),
      signal: AbortSignal.timeout(45_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("SHIVASHA AI provider error:", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      if (upstream.status === 429) return res.status(429).json({ message: "AI service is busy or its API quota is exhausted. Please try again later." });
      return res.status(502).json({ message: "AI provider request failed. Check server-side API configuration and billing." });
    }
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ message: "AI returned an empty response. Please try again." });
    return res.json({ answer, model: process.env.OPENAI_MODEL || "gpt-4o-mini", disclaimer: "AI-generated response; verify important information." });
  } catch (error) {
    console.error("SHIVASHA AI request failed:", error?.name || "Error");
    return res.status(502).json({ message: error?.name === "TimeoutError" ? "AI request timed out. Please try again." : "Could not reach the AI service. Please try again." });
  }
});

export default router;
