import React, { useMemo, useState } from "react";
import "./marketing-studio.css";

const CHANNELS = ["Instagram / Facebook", "YouTube", "WhatsApp", "Website / SEO", "Local business"];
const GOALS = ["Brand awareness", "Get customer enquiries", "Sell a product/service", "Grow followers", "Promote an event"];
const OFFERS = [
  { title: "Campaign Planner", text: "Create a practical campaign brief for a chosen audience, goal and channel." },
  { title: "Social Content Calendar", text: "Plan posts across the week with a clear theme and call to action." },
  { title: "Business Lead Campaign", text: "Prepare a local offer and a simple enquiry follow-up process." },
  { title: "SEO Starter Checklist", text: "Improve page titles, descriptions, headings, image alt text and useful content." },
  { title: "Video Promotion Kit", text: "Draft a short video hook, outline, caption and next step for viewers." },
  { title: "Brand Message Builder", text: "Clarify the audience, problem solved, key benefit and brand voice." }
];

export default function MarketingStudio() {
  const [business, setBusiness] = useState("");
  const [audience, setAudience] = useState("Local customers");
  const [goal, setGoal] = useState(GOALS[1]);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [offer, setOffer] = useState("");
  const [budget, setBudget] = useState("0");
  const [days, setDays] = useState("7");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => {
    const name = business.trim() || "your business";
    const product = offer.trim() || "your main product or service";
    const safeBudget = Math.max(0, Math.min(10000000, Number(budget) || 0));
    const budgetLabel = safeBudget > 0 ? "Set a daily cap and review actual spend before increasing it" : "Start with organic content; do not launch paid ads until the offer is validated";
    return [
      "SHIVASHA MARKETING — CAMPAIGN BRIEF",
      "Business: " + name,
      "Audience: " + audience,
      "Goal: " + goal,
      "Primary channel: " + channel,
      "Offer: " + product,
      "Duration: " + days + " days",
      "Budget: ₹" + safeBudget,
      "",
      "CAMPAIGN STEPS",
      "1. Define one clear customer problem and one measurable call to action.",
      "2. Prepare 3 content angles: problem/solution, proof or demonstration, and frequently asked questions.",
      "3. Publish consistently on " + channel + " and direct interested people to one enquiry path.",
      "4. Respond to genuine enquiries promptly; record source, status and follow-up date.",
      "5. Review reach, clicks, qualified enquiries and conversions at the end of the campaign.",
      "",
      "BUDGET CONTROL",
      budgetLabel + ". Never promise guaranteed reach, sales or rankings.",
      "",
      "SAMPLE POST",
      "Need help with " + product + "? " + name + " helps " + audience.toLowerCase() + " with a clear, practical solution. Message us to discuss your requirement. Please ask for details before making a purchase.",
      "",
      "MEASUREMENT",
      "Track: posts published, profile visits, link clicks, genuine enquiries, response time and completed sales. Compare results with the previous period."
    ].join("\n");
  }, [business, audience, goal, channel, offer, budget, days]);

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setDraft(plan);
      setCopied(false);
    }
  };

  return <section className="content shivasha-marketing">
    <div className="feed-head"><div><span className="eyebrow">SHIVASHA BUSINESS GROWTH</span><h2>SHIVASHA Marketing</h2><p>Plan campaigns, prepare content and track marketing goals in one workspace.</p></div><span className="subscription-mode">STARTER TOOLS</span></div>
    <div className="module-notice">This first release creates plans locally in your browser. It does not publish posts, send bulk messages, run advertisements, or connect to advertising accounts.</div>
    <div className="module-stats">{[["🎯","Campaign planning"],["✍️","Content ideas"],["📈","Measure results"]].map(([icon,label])=><div className="panel" key={label}><span>{icon}</span><strong>{label}</strong></div>)}</div>
    <div className="module-grid">
      <div className="panel">
        <div className="panel-head"><h3>Campaign Planner</h3><span className="house-kicker">FREE STARTER</span></div>
        <label>Business / brand name<input value={business} onChange={e=>setBusiness(e.target.value)} placeholder="e.g. Shivasha Edutech"/></label>
        <label>Target audience<input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who do you want to reach?"/></label>
        <label>Marketing goal<select value={goal} onChange={e=>setGoal(e.target.value)}>{GOALS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Main channel<select value={channel} onChange={e=>setChannel(e.target.value)}>{CHANNELS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Product / offer<input value={offer} onChange={e=>setOffer(e.target.value)} placeholder="What are you promoting?"/></label>
        <div className="module-grid"><label>Duration<select value={days} onChange={e=>setDays(e.target.value)}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><label>Budget (₹ total)<input type="number" min="0" max="10000000" value={budget} onChange={e=>{const value=e.target.value;if(value===""){setBudget("");return;}setBudget(String(Math.max(0,Math.min(10000000,Number(value)||0))));}} /></label></div>
        <button className="primary" onClick={()=>setDraft(plan)}>Generate campaign plan</button>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Your campaign plan</h3><button className="secondary" onClick={copyPlan}>Copy plan</button></div>
        <pre className="marketing-plan" aria-live="polite">{draft || plan}</pre>
        {copied&&<p className="save-message" role="status">Campaign plan copied.</p>}
        <button className="secondary" onClick={()=>setDraft(plan)}>Refresh plan preview</button>
      </div>
    </div>
    <div className="panel"><div className="panel-head"><h3>Marketing tools</h3><span className="muted">Planned workspace modules</span></div><div className="module-grid">{OFFERS.map((item,i)=><article className="panel marketing-tool-card" key={item.title}><span className="feed-kicker">TOOL {String(i+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.text}</p><button className="secondary" onClick={()=>{setGoal(i===2?GOALS[1]:i===1?GOALS[3]:GOALS[0]);setDraft("")}}>Use in campaign</button></article>)}</div></div>
    <div className="panel"><h3>Responsible marketing checklist</h3><ul><li>Get consent before sending promotional WhatsApp or email messages.</li><li>Use truthful claims, real prices and clear offer conditions.</li><li>Do not buy contact lists or send unsolicited bulk messages.</li><li>Measure actual enquiries and sales; never treat estimates as guaranteed results.</li><li>Keep customer data private and collect only what is needed.</li></ul></div>
  </section>;
}
