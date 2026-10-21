import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const SUGGESTIONS = [
  "Mujhe acidity hoti hai. Safe lifestyle changes kya hain?",
  "Ayurveda mein dincharya aur neend ke liye general guidance dein.",
  "Tulsi ya ashwagandha lene se pehle kin safety baaton ka dhyan rakhein?",
  "How can I build a balanced daily routine using general Ayurvedic principles?"
];

export default function AyurvedicAIHelp() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (text = question) => {
    const prompt = text.trim();
    if (!prompt || loading) return;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    setQuestion("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_BASE + "/api/ayurveda-ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, history })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Ayurvedic AI is temporarily unavailable.");
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "I could not prepare an answer. Please try again." }]);
    } catch (e) {
      setError(e.message || "Connection problem. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => { setMessages([]); setQuestion(""); setError(""); };

  return <section className="content ayurveda-page">
    <style>{`
      .ayurveda-page{max-width:1000px;margin:0 auto}.ayurveda-hero{display:flex;gap:18px;align-items:center;padding:25px;border-radius:20px;background:linear-gradient(130deg,#123f32,#17624b 60%,#d5a64b);color:#fff}.ayurveda-mark{display:grid;place-items:center;flex:0 0 62px;height:62px;border-radius:18px;background:#ffffff20;font-size:34px}.ayurveda-hero h2{font-size:clamp(23px,4vw,34px);margin:7px 0}.ayurveda-hero p{margin:0;color:#e0f0e8;line-height:1.6;font-size:13px}.ayurveda-kicker{font-size:10px;letter-spacing:1.5px;font-weight:800;color:#d8c17f}.ayurveda-safety{margin:15px 0;padding:14px 16px;border:1px solid #f1d6a5;background:#fff8e8;color:#664a1e;border-radius:12px;font-size:12px;line-height:1.65}.ayurveda-emergency{margin:12px 0;padding:12px 15px;border-left:4px solid #b42318;background:#fff1f0;border-radius:8px;color:#842018;font-size:12px;line-height:1.6}.ayurveda-chat{margin-top:16px;padding:20px}.ayurveda-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ayurveda-chat-head h3{margin:0 0 5px}.ayurveda-chat-head p{margin:0;color:#758094;font-size:12px}.ayurveda-prompts{display:flex;flex-wrap:wrap;gap:8px;margin:17px 0}.ayurveda-prompts button{border:1px solid #d9e8df;background:#f2faf5;color:#245541;border-radius:20px;padding:9px 12px;font-size:12px;cursor:pointer}.ayurveda-messages{display:flex;flex-direction:column;gap:12px;max-height:460px;overflow:auto;padding:4px 0 14px}.ayurveda-message{max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:13px;padding:13px 15px;border-radius:14px}.ayurveda-message.user{align-self:flex-end;background:#e4f2e8;color:#173e2e;border-bottom-right-radius:4px}.ayurveda-message.assistant{align-self:flex-start;background:#f5f6f8;color:#293243;border-bottom-left-radius:4px}.ayurveda-chat-empty{padding:25px 10px;text-align:center;color:#768194}.ayurveda-chat-empty strong{display:block;color:#293243;margin:8px}.ayurveda-compose{display:flex;gap:9px;align-items:flex-end;border-top:1px solid #e8ebf0;padding-top:15px}.ayurveda-compose textarea{flex:1;min-width:0;resize:vertical;min-height:50px;max-height:150px;border:1px solid #d9dfe7;border-radius:12px;padding:12px;font:inherit;font-size:13px}.ayurveda-compose button{min-height:45px;border:0;border-radius:11px;background:#17624b;color:#fff;font-weight:750;padding:0 18px;cursor:pointer}.ayurveda-compose button:disabled{opacity:.55;cursor:not-allowed}.ayurveda-footnote{font-size:11px;color:#7c8796;line-height:1.6;margin-top:14px}@media(max-width:600px){.ayurveda-hero{padding:18px;align-items:flex-start}.ayurveda-mark{flex-basis:48px;height:48px;font-size:27px}.ayurveda-chat{padding:14px}.ayurveda-message{max-width:100%}.ayurveda-compose{align-items:stretch}.ayurveda-compose button{padding:0 13px}}
    `}</style>
    <div className="ayurveda-hero"><div className="ayurveda-mark" aria-hidden="true">🌿</div><div><span className="ayurveda-kicker">SHIVASHA WELLBEING · HOUSE 6</span><h2>AI Ayurvedic Help</h2><p>आयुर्वेद, दिनचर्या, आहार और सामान्य wellbeing के बारे में सरल हिंदी या English में जानकारी पूछें।</p></div></div>
    <div className="ayurveda-safety"><b>Health safety:</b> यह educational assistant है—doctor नहीं। यह diagnosis, prescription या दवा की dose नहीं देता। Herbs/supplements भी side effects और medicines के साथ interactions कर सकते हैं; शुरू करने से पहले qualified doctor/registered AYUSH practitioner से सलाह लें।</div>
    <div className="ayurveda-emergency"><b>Emergency:</b> सांस लेने में कठिनाई, सीने में तेज दर्द, बेहोशी, stroke के संकेत, गंभीर एलर्जी या बहुत तेज/अचानक लक्षण हों तो AI का इंतजार न करें—तुरंत स्थानीय emergency service या अस्पताल से संपर्क करें।</div>
    <div className="panel ayurveda-chat">
      <div className="ayurveda-chat-head"><div><h3>पूछें — Ask Ayurvedic AI</h3><p>Hindi, Hinglish या English में सवाल लिखें।</p></div><button type="button" className="secondary" onClick={clearChat} disabled={!messages.length && !error}>New chat</button></div>
      {!messages.length && <div className="ayurveda-prompts">{SUGGESTIONS.map(s => <button type="button" key={s} onClick={() => ask(s)} disabled={loading}>{s}</button>)}</div>}
      <div className="ayurveda-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={"ayurveda-message "+m.role}><b>{m.role==="user"?"You":"Ayurvedic AI"}</b><div>{m.content}</div></div>)}{loading&&<div className="ayurveda-message assistant" role="status">आपके सवाल के लिए सुरक्षित सामान्य जानकारी तैयार हो रही है…</div>}{!messages.length&&!loading&&<div className="ayurveda-chat-empty"><div style={{fontSize:30}}>☘</div><strong>आपकी wellbeing journey यहीं से शुरू करें</strong><span>उदाहरण चुनें या अपना सवाल लिखें।</span></div>}</div>
      {error&&<div className="login-message" role="alert">{error}</div>}
      <form className="ayurveda-compose" onSubmit={e=>{e.preventDefault();ask()}}><textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={3000} placeholder="अपना सवाल लिखें… (medical emergency नहीं)" aria-label="Ask Ayurvedic AI" /><button type="submit" disabled={loading||!question.trim()}>{loading?"Please wait…":"Ask AI ↗"}</button></form>
      <p className="ayurveda-footnote">Privacy: सवाल chat में इस स्क्रीन पर ही दिखते हैं; इस feature में chat history database में save नहीं की जाती। फिर भी passwords, Aadhaar/PAN, या अन्य पहचान संबंधी जानकारी न लिखें। AI की जानकारी गलत या अधूरी हो सकती है—treatment decisions के लिए clinician से पुष्टि करें।</p>
    </div>
  </section>;
}
