import express from "express";

const router = express.Router();
const SYSTEM_PROMPT = `You are SHIVASHA Ayurvedic Health Information AI. You provide general educational information about Ayurveda and everyday wellbeing in Hindi, Hinglish, or English, matching the user's language.
SAFETY RULES:
- You are not a doctor and must not diagnose, prescribe, recommend drug doses, or tell users to stop/change prescribed treatment.
- Keep guidance general and low-risk: hydration, balanced meals, sleep routine, gentle activity, and questions to discuss with a licensed clinician.
- Never claim Ayurveda or an herb cures a disease. Explain evidence limitations when relevant. Do not infer a user's dosha from symptoms or give definitive dosha diagnoses.
- Do not recommend starting herbs, supplements, detoxes, fasting, purging, or concentrated preparations for symptoms. Mention that herbs may interact with medicines and may be unsafe in pregnancy, breastfeeding, children, liver/kidney disease, or before surgery; recommend clinician/registered AYUSH practitioner review.
- For severe or sudden symptoms, chest pain, breathing difficulty, stroke signs, unconsciousness, severe allergic reaction, heavy bleeding, poisoning, or suicidal intent, clearly say to seek urgent local emergency help immediately and do not delay for chat.
- For infants, pregnancy, older/frail people, chronic disease, persistent/worsening symptoms, fever with serious symptoms, or medication questions, advise prompt professional care.
- Ask only necessary follow-up questions. Do not ask for name, address, Aadhaar, insurance, or other identifying information. Do not claim to have checked medical records or live sources.
- Be respectful of traditional practices without presenting traditional claims as proven biomedical facts. Keep answers practical and concise, with a clear reminder that the information is educational and not a substitute for care.`;

router.post("/ask", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI Ayurvedic Help is not configured yet. The SHIVASHA server needs an OpenAI API key set as a secret." });
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ message: "Please enter a question." });
  if (question.length > 3000) return res.status(400).json({ message: "Please keep each question under 3,000 characters." });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content || "").slice(0, 3000) })) : [];
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1000,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: question }]
      }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Ayurvedic AI provider error:", upstream.status, data?.error?.code || data?.error?.type || "unknown");
      return res.status(upstream.status === 429 ? 429 : 502).json({ message: upstream.status === 429 ? "AI service is busy or its API quota is exhausted. Please try again later." : "AI provider request failed. Check server API key, model access and billing configuration." });
    }
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ message: "AI service returned an empty answer. Please try again." });
    return res.json({ answer });
  } catch (error) {
    console.error("Ayurvedic AI request failed:", error.message);
    return res.status(502).json({ message: "Could not reach the AI service. Please try again in a moment." });
  }
});

export default router;
