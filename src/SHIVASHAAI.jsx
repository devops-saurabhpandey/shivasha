import React, { useState } from "react";
import "./SHIVASHAAI.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");

export default function SHIVASHAAI({ auth }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(event) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    if (message.length > 4000) { setError("Message 4,000 characters se chhota rakhein."); return; }
    const next = [...messages, { role: "user", content: message }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch(API_BASE + "/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}) },
        body: JSON.stringify({ message, history: messages.slice(-8) }),
        signal: AbortSignal.timeout(50000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "AI request failed. Please try again.");
      if (!data.answer) throw new Error("AI se khaali jawab mila. Dobara koshish karein.");
      setMessages([...next, { role: "assistant", content: data.answer, disclaimer: data.disclaimer }]);
    } catch (e) {
      setMessages(next);
      setError(e.name === "TimeoutError" ? "Request mein der ho rahi hai. Dobara try karein." : e.message || "SHIVASHA AI se connect nahi ho paya.");
    } finally { setBusy(false); }
  }

  return <section className="content shivasha-ai-page">
    <div className="shivasha-ai-hero"><div className="shivasha-ai-orb">✦</div><div><span className="feed-kicker">YOUR AI WORKSPACE</span><h2>SHIVASHA AI</h2><p>Hindi, English ya Hinglish mein sawal poochhein, ideas banayein aur apne kaam ki planning karein.</p></div></div>
    <div className="shivasha-ai-chat">
      {messages.length === 0 ? <div className="shivasha-ai-empty"><span>✧</span><h3>Aaj kis cheez mein madad chahiye?</h3><p>Business ideas, writing, learning, coding aur rozmarra ke kaam.</p><div className="shivasha-ai-suggestions">{["Mere business ke liye 5 marketing ideas do","React app banana kaise shuru karun?","Is hafte ka simple study plan banao"].map(s=><button key={s} onClick={()=>setInput(s)}>{s} ↗</button>)}</div></div> :
      <div className="shivasha-ai-messages" aria-live="polite">{messages.map((m,i)=><article key={i} className={"shivasha-ai-message "+m.role}><b>{m.role==="user"?"Aap":"SHIVASHA AI"}</b><p>{m.content}</p>{m.disclaimer&&<small>{m.disclaimer}</small>}</article>)}{busy&&<div className="shivasha-ai-typing" role="status">SHIVASHA AI jawab taiyar kar raha hai…</div>}</div>}
      {error&&<div className="shivasha-ai-error" role="alert">{error}</div>}
      <form className="shivasha-ai-form" onSubmit={send}><textarea value={input} onChange={e=>setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Yahan apna sawal likhein…" aria-label="Message SHIVASHA AI" disabled={busy}/><div className="shivasha-ai-form-footer"><small>{input.length}/4000 · AI jawab ko zaroori faislon se pehle verify karein.</small><button className="primary" type="submit" disabled={busy||!input.trim()}>{busy?"Soch raha hai…":"Send ↑"}</button></div></form>
    </div>
  </section>;
}
