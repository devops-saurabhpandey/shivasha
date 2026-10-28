import React, { useMemo, useState } from "react";

const ideas = {
  Social: ["Ask a question your audience can answer in one line.", "Share a useful tip and invite people to follow for more.", "Introduce a community member and celebrate their work."],
  Business: ["Explain one problem your business solves.", "Post a customer FAQ with a clear inquiry call-to-action.", "Share a short case study with permission from the customer."],
  Education: ["Publish a 3-step learning tip.", "Ask learners which topic they want next.", "Share a quiz and reveal the answer in the comments."],
  Spiritual: ["Share a thoughtful daily reflection.", "Ask followers what good action they practised today.", "Post a short wisdom quote with your own explanation."]
};

export default function VisitorsAttractorAI() {
  const [goal, setGoal] = useState("Social");
  const [audience, setAudience] = useState("Everyone");
  const [topic, setTopic] = useState("Welcome to SHIVASHA");
  const [tone, setTone] = useState("Friendly");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shivasha_growth_drafts") || "[]"); } catch { return []; }
  });
  const draft = useMemo(() => {
    const cta = goal === "Business" ? "Need help with this? Connect with me on SHIVASHA." : "Follow SHIVASHA for useful ideas, community and updates.";
    return `${topic.trim() || "Hello SHIVASHA community"}\n\n${tone === "Professional" ? "Here is something useful for our community:" : tone === "Energetic" ? "Let's grow and learn together! 🚀" : "Let's connect and learn together! 💚"}\n\nI'm sharing this for ${audience.toLowerCase()}. What would you like to see next?\n\n${cta}\n\n#SHIVASHA #ConnectLearnGrow`;
  }, [goal, audience, topic, tone]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(draft); setNotice("Post copied. Share it on your SHIVASHA feed or social channels."); }
    catch { setNotice("Select and copy the generated post below."); }
  };
  const save = () => {
    const next = [{ id: Date.now(), goal, topic, draft, createdAt: new Date().toLocaleString() }, ...saved].slice(0, 20);
    setSaved(next); localStorage.setItem("shivasha_growth_drafts", JSON.stringify(next)); setNotice("Draft saved on this device.");
  };
  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    try { if (navigator.share) await navigator.share({ title: "Join SHIVASHA", text: "Connect, learn and grow with the SHIVASHA community.", url }); else { await navigator.clipboard.writeText(url); setNotice("SHIVASHA link copied. Send it to people who may genuinely be interested."); } }
    catch { /* user cancelled sharing */ }
  };
  const shareTo = (platform) => {
    const appUrl = window.location.origin + window.location.pathname;
    const message = draft + "\\n\\nJoin SHIVASHA: " + appUrl;
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(appUrl);
    const targets = {
      WhatsApp: "https://wa.me/?text=" + encodedMessage,
      Telegram: "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodeURIComponent(draft),
      Facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl,
      LinkedIn: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl
    };
    if (targets[platform]) window.open(targets[platform], "_blank", "noopener,noreferrer");
  };
  return <section className="content">
    <div className="panel" style={{padding:22,borderRadius:18}}>
      <div style={{fontSize:12,fontWeight:900,letterSpacing:".08em",color:"#16845b"}}>SHIVASHA GROWTH TOOLS</div>
      <h2 style={{margin:"8px 0"}}>🚀 Visitors Attractor AI</h2>
      <p style={{color:"#64748b",lineHeight:1.6}}>Create share-worthy posts, plan organic reach and invite real people who may value your community.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginTop:18}}>
        <label>Audience / section<select value={goal} onChange={e=>setGoal(e.target.value)} style={field}><option>Social</option><option>Business</option><option>Education</option><option>Spiritual</option></select></label>
        <label>Who is this for?<select value={audience} onChange={e=>setAudience(e.target.value)} style={field}><option>Everyone</option><option>Business owners</option><option>Students</option><option>Creators</option><option>Spiritual learners</option><option>Local community</option></select></label>
        <label>Writing tone<select value={tone} onChange={e=>setTone(e.target.value)} style={field}><option>Friendly</option><option>Professional</option><option>Energetic</option></select></label>
      </div>
      <label style={{display:"block",marginTop:14}}>Post topic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What do you want to share?" style={field}/></label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}><button className="primary" onClick={copy}>Copy post</button><button className="secondary" onClick={save}>Save draft</button><button className="secondary" onClick={share}>Invite / share SHIVASHA</button><button className="secondary" onClick={()=>shareTo("WhatsApp")}>Share to WhatsApp</button><button className="secondary" onClick={()=>shareTo("Telegram")}>Share to Telegram</button><button className="secondary" onClick={()=>shareTo("Facebook")}>Share to Facebook</button><button className="secondary" onClick={()=>shareTo("LinkedIn")}>Share to LinkedIn</button></div>
      <label style={{display:"block",marginTop:18}}>Ready-to-share post<textarea readOnly value={draft} rows={7} style={{...field,resize:"vertical",fontFamily:"inherit"}}/></label>
      {notice && <p role="status" style={{color:"#16845b",fontWeight:700}}>{notice}</p>}
    </div>
    <div className="panel" style={{padding:22,borderRadius:18,marginTop:16}}>
      <h3>📈 Today's organic growth plan</h3>
      <ol style={{lineHeight:1.9,paddingLeft:22}}>{(ideas[goal] || ideas.Social).map((x,i)=><li key={i}>{x}</li>)}<li>Reply thoughtfully to comments and invite interested people to follow.</li><li>Share your profile link with relevant groups only where promotion is welcome.</li></ol>
      <p style={{fontSize:13,color:"#64748b"}}>Saved drafts: {saved.length}. Drafts are stored in this browser on this device.</p>
      {saved.length>0 && <div style={{display:"grid",gap:8}}>{saved.slice(0,5).map(x=><div key={x.id} style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}}><b>{x.topic}</b><small style={{display:"block",color:"#64748b"}}>{x.createdAt}</small><button className="secondary" style={{marginTop:6}} onClick={()=>{setGoal(x.goal);setTopic(x.topic);setNotice("Draft loaded into the editor.");}}>Edit draft</button></div>)}</div>}
      <p style={{fontSize:12,color:"#64748b",marginTop:14}}>Note: this tool helps attract genuine visitors; it does not create fake followers, auto-follow people, or send unsolicited messages. Actual automatic follower growth cannot be guaranteed and requires real user interest and supported platform integrations.</p>
    </div>
    <GrowthTracker />
  </section>;
}

function GrowthTracker() {
  const tasks = [
    "Publish one helpful original post",
    "Share your SHIVASHA profile with 3 relevant people",
    "Reply to every genuine comment or inquiry",
    "Comment helpfully on 3 relevant community posts",
    "Invite interested people to follow SHIVASHA",
    "Share one useful tip, poll or question",
    "Review profile visits, follows and best-performing post"
  ];
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem("shivasha_growth_tasks") || "{}"); } catch { return {}; } });
  const [stats, setStats] = useState(() => { try { return JSON.parse(localStorage.getItem("shivasha_growth_stats") || '{"visits":0,"followers":0,"posts":0}'); } catch { return {visits:0,followers:0,posts:0}; } });
  const toggle = i => { const next={...done,[i]:!done[i]}; setDone(next); localStorage.setItem("shivasha_growth_tasks",JSON.stringify(next)); };
  const update = (key,value) => { const next={...stats,[key]:Math.max(0,Number(value)||0)}; setStats(next); localStorage.setItem("shivasha_growth_stats",JSON.stringify(next)); };
  return <div className="panel" style={{padding:22,borderRadius:18,marginTop:16}}>
    <h3>📅 7-day growth tracker</h3>
    <p style={{color:"#64748b"}}>Daily checklist and simple metrics to see whether your content is bringing real people.</p>
    <div style={{display:"grid",gap:9}}>{tasks.map((task,i)=><label key={task} style={{display:"flex",gap:10,alignItems:"center",padding:10,border:"1px solid #e2e8f0",borderRadius:10}}><input type="checkbox" checked={!!done[i]} onChange={()=>toggle(i)}/><span style={{textDecoration:done[i]?"line-through":"none"}}>{task}</span></label>)}</div>
    <h4 style={{marginBottom:8}}>Record your actual results</h4>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>{[["visits","Profile visits"],["followers","New followers"],["posts","Posts shared"]].map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={stats[key]} onChange={e=>update(key,e.target.value)} style={field}/></label>)}</div>
    <p style={{fontSize:12,color:"#64748b"}}>Checklist and numbers are saved locally in this browser, not synced across devices. Enter only real results; follower growth is not guaranteed.</p>
  </div>;
}
const field = {display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:"1px solid #cbd5e1",borderRadius:10,background:"#fff",color:"#0f172a"};
