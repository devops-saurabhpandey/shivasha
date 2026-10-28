import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const windows = new Map();
const MAX_PER_MINUTE = 8;

function buildTemplateResult({ product, customerType, customerNeed, price, language, channel }) {
  const priceLine = price ? (language === "Hindi" ? `बताई गई कीमत/ऑफ़र: ${price}।` : language === "English" ? `Shared price/offer: ${price}.` : `Batayi gayi price/offer: ${price}.`) : "";
  const templates = {
    Hindi: {
      approach: `${customerType} से पहले उनकी जरूरत समझें। ${product} को केवल इस जरूरत के संदर्भ में समझाएँ: ${customerNeed}।`,
      questions: ["इस समय आपकी सबसे बड़ी चुनौती क्या है?", "आप अभी इसे कैसे संभालते हैं?", "आपके लिए सबसे जरूरी परिणाम क्या होगा?", "निर्णय लेने से पहले कौन-सी जानकारी चाहिए?"],
      message: `नमस्ते! मैं SHIVASHA से संपर्क कर रहा/रही हूँ। आपने जिस जरूरत का उल्लेख किया—${customerNeed}—उसके संदर्भ में ${product} पर बात कर सकते हैं। ${priceLine} क्या आप चाहेंगे कि मैं इसकी जानकारी साझा करूँ? अगर यह आपके लिए प्रासंगिक नहीं है, तो कृपया बताइए।`,
      objections: [{ objection: "अभी जरूरत नहीं है", response: "समझ सकता/सकती हूँ। क्या भविष्य में संपर्क करने का कोई उपयुक्त समय होगा?" }, { objection: "पहले और जानकारी चाहिए", response: "बिल्कुल। आपकी जरूरत के हिसाब से कौन-सी जानकारी सबसे उपयोगी होगी?" }],
      nextStep: "ग्राहक की अनुमति लेकर एक स्पष्ट जानकारी-पत्र या छोटा डेमो साझा करें।"
    },
    English: {
      approach: `Start by understanding this ${customerType}'s needs. Discuss ${product} only in relation to the stated need: ${customerNeed}.`,
      questions: ["What is your biggest challenge right now?", "How are you handling it today?", "What outcome matters most to you?", "What information would help you decide?"],
      message: `Hello! I'm reaching out from SHIVASHA. Based on your need—${customerNeed}—we could explore whether ${product} is relevant for you. ${priceLine} Would you like me to share more details? If this isn't relevant, just let me know.`,
      objections: [{ objection: "I don't need this right now", response: "Understood. Would a later follow-up be useful, or should I close the loop?" }, { objection: "I need more information", response: "Of course. Which details would help you evaluate whether this fits your needs?" }],
      nextStep: "Ask permission to share a concise information sheet or arrange a short demo."
    },
    Hinglish: {
      approach: `${customerType} ki need pehle samjhein. ${product} ko sirf is problem ke context mein explain karein: ${customerNeed}.`,
      questions: ["Abhi aapki sabse badi challenge kya hai?", "Aap filhaal ise kaise manage karte hain?", "Aapke liye sabse important result kya hoga?", "Decision se pehle kaunsi information chahiye?"],
      message: `Namaste! Main SHIVASHA se contact kar raha/rahi hoon. Aapki need—${customerNeed}—ko dekhte hue hum discuss kar sakte hain ki ${product} aapke liye useful hai ya nahi. ${priceLine} Kya main aapko details share kar sakta/sakti hoon? Agar relevant nahi hai, to please bata dein.`,
      objections: [{ objection: "Abhi zarurat nahi hai", response: "Samajh sakta/sakti hoon. Kya future mein follow-up ka koi suitable time rahega?" }, { objection: "Aur details chahiye", response: "Bilkul. Evaluate karne ke liye aapko kaunsi details sabse useful hongi?" }],
      nextStep: "Permission lekar short information sheet ya demo share karein."
    }
  };
  const result = templates[language] || templates.Hinglish;
  return { ...result, approach: result.approach + (channel ? ` Communication channel: ${channel}.` : "") };
}

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
  if (!apiKey) {
    const result = buildTemplateResult({ product, customerType, customerNeed, price, language, channel });
    return res.json({
      result,
      mode: "basic_template",
      disclaimer: "Basic template mode: no external AI provider used and no AI API charge. Review and personalize every suggestion before sending."
    });
  }

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
    return res.json({ result, mode: "ai", disclaimer: "AI-generated sales suggestions; review before use." });
  } catch (error) {
    console.error("Sales agent request failed:", error?.name || "Error");
    return res.status(502).json({ message: error?.name === "TimeoutError" ? "Sales AI timed out. Please retry." : "Could not reach the AI provider. Please retry." });
  }
});

export default router;
