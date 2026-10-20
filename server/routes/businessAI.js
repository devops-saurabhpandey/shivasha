import express from "express";
const router = express.Router();
const SYSTEM_PROMPT = `You are SHIVASHA Business AI, an informational assistant for businesses operating in India. Answer in the language the user uses (Hindi, English or Hinglish). Be practical, clear and structured. Provide a short answer, applicable caveats, step-by-step next actions, and official government sources as plain URLs when helpful. Distinguish central law from state-specific rules and note when applicability depends on turnover, workforce, entity type, location, dates or business activity. Never invent statutes, sections, fees, deadlines, citations or guarantees. If current legal status is uncertain, say so and recommend checking the official portal. You are not a lawyer, CA or Company Secretary and must not present the answer as legal advice. For a legal notice, court matter, tax dispute or deadline-sensitive issue, recommend prompt professional review. Do not request passwords, Aadhaar/PAN numbers or unnecessary sensitive data. Do not claim to have searched live sources unless you actually did.`;
router.post("/ask", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({error:"AI_NOT_CONFIGURED",message:"Business AI needs an OpenAI API key configured securely in the SHIVASHA server environment."});
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({message:"Please enter a question."});
  if (question.length > 4000) return res.status(400).json({message:"Please keep each question under 4,000 characters."});
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map(m => ({role:m?.role === "assistant" ? "assistant" : "user",content:String(m?.content || "").slice(0,4000)})) : [];
  const context = ["Business: " + String(req.body?.business || "Not provided").slice(0,120),"State/UT: " + String(req.body?.state || "Not provided").slice(0,100),"Entity type: " + String(req.body?.structure || "Not decided").slice(0,100),"Selected topic: " + String(req.body?.topic || "General business law").slice(0,160)].join("\n");
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL || "gpt-4o-mini",temperature:0.2,max_tokens:1200,messages:[{role:"system",content:SYSTEM_PROMPT},{role:"system",content:"User business context:\n"+context},...history,{role:"user",content:question}]}),signal:AbortSignal.timeout(45000)});
    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) { console.error("Business AI provider error:",upstream.status,data?.error?.code||data?.error?.type||"unknown"); return res.status(upstream.status===429?429:502).json({message:upstream.status===429?"AI service is busy or the API quota is exhausted. Please try again later.":"AI provider request failed. Check the server API key, model access and billing configuration."}); }
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({message:"AI service returned an empty answer. Please try again."});
    const sources = [...new Set(answer.match(/https?:\/\/[^\s)\]}>,]+/g)||[])].map(url=>url.replace(/[.,;]+$/,"")).filter(url=>{try{return /\.(gov\.in|nic\.in)$/i.test(new URL(url).hostname)}catch{return false}}).slice(0,6).map(url=>({title:new URL(url).hostname,url}));
    return res.json({answer,sources});
  } catch (error) { console.error("Business AI request failed:",error.message); return res.status(502).json({message:"Could not reach the AI service. Please try again in a moment."}); }
});
export default router;
