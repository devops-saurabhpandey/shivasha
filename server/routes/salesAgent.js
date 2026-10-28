import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const windows = new Map();
const MAX_PER_MINUTE = 8;

router.post("/generate", requireAuth, async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "unknown");
  const now = Date.now();
  const previous = windows.get(userId);
  if (previous && now - previous.startedAt < 60_000 && previous.count >= MAX_PER_MINUTE) {
    res.set("Retry-After", String(Math.ceil((60_000 - (now - previous.startedAt)) / 1000)));
    return res.status(429).json({ message: "Sales AI limit reached. Please wait a minute and try again." });
  }
  windows.set(userId, previous && now - previous.startedAt < 60_000 ? { startedAt: previous.startedAt, count: previous.count + 1 } : { startedAt: now, count: 1 });
  if (windows.size > 5000) for (const [key, value] of windows) if (now - value.startedAt >= 60_000) windows.delete(key);

  const product = String(req.body?.product || "").trim().slice(0, 180);
  const customerType = String(req.body?.customerType || "Customer").trim().slice(0, 100);
  const customerNeed = String(req.body?.customerNeed || "").trim().slice(0, 1500);
  const price = String(req.body?.price || "").trim().slice(0, 120);
  const language = ["Hindi", "English", "Hinglish"].includes(req.body?.language) ? req.body.language : "Hinglish";
  const channel = ["WhatsApp", "Phone call", "Email", "In-person", "SHIVASHA message"].includes(req.body?.channel) ? req.body.channel : "WhatsApp";
  if (!product || !customerNeed) return res.status(400).json({ message: "Product/service and customer need are required." });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI Sales Agent needs OPENAI_API_KEY in the private SHIVASHA backend environment. No key is stored in frontend or GitHub." });

  const system = `You are SHIVASHA AI Sales Agent. Generate ethical, consultative sales support, not deceptive pressure. Answer only in ${language}. Return valid JSON with exactly these keys: approach (string), questions (array of 3-5 short strings), message (string), objections (array of 2-4 objects with objection and response strings), nextStep (string). Tailor the message to channel ${channel} and customer type ${customerType}. Use only the supplied product, need, and price facts. If price is blank, do not invent a price. Never invent product features, discounts, guarantees, testimonials, scarcity or results. Do not request sensitive personal data. Encourage respectful opt-out and human review before sending. No automatic sending.`;
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ product, customerType, customerNeed, price: price || "Not supplied" }) }
        ]
      }),
      signal: AbortSignal.timeout(35_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Sales agent provider error:", upstream.status, data?.error?.code || "unknown");
      return res.status(upstream.status === 429 ? 429 : 502).json({ message: upstream.status === 429 ? "AI provider quota or rate limit reached. Please try later." : "Sales AI provider failed. Check private server API configuration and quota." });
    }
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return res.status(502).json({ message: "Sales AI returned an empty response." });
    let result;
    try { result = JSON.parse(raw); } catch { return res.status(502).json({ message: "Sales AI returned an invalid response. Please retry." }); }
    if (typeof result.approach !== "string" || typeof result.message !== "string" || !Array.isArray(result.questions) || !Array.isArray(result.objections) || typeof result.nextStep !== "string") {
      return res.status(502).json({ message: "Sales AI response did not match the expected format. Please retry." });
    }
    result.questions = result.questions.filter(x => typeof x === "string").slice(0, 5);
    result.objections = result.objections.filter(x => x && typeof x.objection === "string" && typeof x.response === "string").slice(0, 4);
    return res.json({ result, disclaimer: "AI-generated sales suggestions; review before use." });
  } catch (error) {
    console.error("Sales agent request failed:", error?.name || "Error");
    return res.status(502).json({ message: error?.name === "TimeoutError" ? "Sales AI timed out. Please retry." : "Could not reach the AI provider. Please retry." });
  }
});

export default router;
