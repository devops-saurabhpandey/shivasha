import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requestChatCompletion, getAIProviderConfig } from "../utils/aiProvider.js";

const router = express.Router();
const MAX_PROMPT_LENGTH = 2500;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const windows = new Map();

function limit(req, res, next) {
  const key = String(req.user?.id || req.ip || "unknown");
  const now = Date.now();
  let entry = windows.get(key);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    windows.set(key, { startedAt: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    res.set("Retry-After", String(Math.ceil((WINDOW_MS - (now - entry.startedAt)) / 1000)));
    return res.status(429).json({ message: "Design AI limit reached. Please wait one minute." });
  }
  return next();
}

router.post("/generate", requireAuth, limit, async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const target = req.body?.target === "mobile" ? "mobile" : "website";
  if (!prompt) return res.status(400).json({ message: "Please describe your design idea." });
  if (prompt.length > MAX_PROMPT_LENGTH) return res.status(400).json({ message: "Prompt must be 2,500 characters or fewer." });
  const config = getAIProviderConfig();
  if (!process.env.AI_BASE_URL && !config.apiKey) return res.status(503).json({
    code: "AI_NOT_CONFIGURED",
    message: "Configure AI_BASE_URL for your self-hosted model, or AI_API_KEY/OPENAI_API_KEY for a hosted provider."
  });

  try {
    const { response: upstream, data, model } = await requestChatCompletion({
      temperature: 0.4,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior UI/UX designer. Return only valid JSON with keys: name (short), description (one sentence), primary (hex color), sections (array of 3-5 objects with title and description). Keep content accessible, responsive, and practical. No HTML, scripts, or markdown." },
        { role: "user", content: `Create a ${target} UI/UX concept for: ${prompt}` }
      ]
    }, { timeoutMs: 35_000 });
    if (!upstream.ok) {
      console.error("UI/UX AI provider error:", upstream.status, data?.error?.code || "unknown");
      if (upstream.status === 429) return res.status(429).json({ message: "Configured AI provider quota or rate limit reached." });
      return res.status(502).json({ message: "Configured AI provider request failed. Check its endpoint and model." });
    }
    const raw = data?.choices?.[0]?.message?.content || "";
    let concept;
    try { concept = JSON.parse(raw); } catch { return res.status(502).json({ message: "AI returned an invalid design format. Please retry." }); }
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(concept.primary) ? concept.primary : "#5b4bdb";
    const sections = Array.isArray(concept.sections) ? concept.sections.slice(0, 5).map(item => ({
      title: String(item?.title || "Section").slice(0, 80),
      description: String(item?.description || "").slice(0, 240)
    })) : [];
    return res.json({
      concept: {
        name: String(concept.name || "New design").slice(0, 100),
        description: String(concept.description || prompt).slice(0, 300),
        primary: safeColor,
        target,
        sections
      },
      model
    });
  } catch (error) {
    console.error("UI/UX AI request failed:", error?.name || "Error");
    return res.status(502).json({ message: error?.name === "TimeoutError" ? "Design generation timed out." : "Could not reach the configured AI service." });
  }
});

export default router;
