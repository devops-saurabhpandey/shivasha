import React, { useMemo, useState } from "react";

const WEEKDAYS = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTHS = ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"];
const formatLong = d => new Intl.DateTimeFormat("hi-IN", {weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d);
const indianDate = d => {
  try { return new Intl.DateTimeFormat("hi-IN-u-ca-indian", {day:"numeric",month:"long",year:"numeric"}).format(d); }
  catch { return "भारतीय राष्ट्रीय पंचांग उपलब्ध नहीं"; }
};

export default function HinduCalendar() {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = first.getDay();
    const count = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({length:count},(_,i)=>new Date(view.getFullYear(),view.getMonth(),i+1))];
  }, [view]);
  const move = n => setView(new Date(view.getFullYear(), view.getMonth()+n, 1));
  const isSame = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  return <section className="content hindu-calendar">
    <div className="feed-head"><div><span className="feed-kicker">SHIVASHA · भारतीय संस्कृति</span><h2>🪔 हिंदू कैलेंडर</h2><p>तारीखें देखें और अपने महत्वपूर्ण दिनों की योजना बनाएँ।</p></div><button className="secondary" onClick={()=>{setView(new Date(today.getFullYear(),today.getMonth(),1));setSelected(today)}}>आज पर जाएँ</button></div>
    <div className="hindu-calendar-grid">
      <div className="panel calendar-month">
        <div className="calendar-controls"><button className="secondary" onClick={()=>move(-1)} aria-label="पिछला महीना">‹</button><h3>{MONTHS[view.getMonth()]} {view.getFullYear()}</h3><button className="secondary" onClick={()=>move(1)} aria-label="अगला महीना">›</button></div>
        <div className="calendar-days">{WEEKDAYS.map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{days.map((d,i)=>d?<button key={d.toISOString()} className={"calendar-day"+(isSame(d,today)?" today":"")+(isSame(d,selected)?" selected":"")} onClick={()=>setSelected(d)} aria-pressed={isSame(d,selected)}>{d.getDate()}</button>:<span className="calendar-day blank" key={"blank-"+i}/>)}</div>
        <div className="calendar-legend"><span><i className="today-dot"/> आज</span><span>तारीख चुनकर विवरण देखें</span></div>
      </div>
      <aside className="panel calendar-detail"><div className="calendar-diya">🪔</div><span className="eyebrow">चुनी हुई तारीख</span><h3>{formatLong(selected)}</h3><div className="calendar-info-row"><span>भारतीय राष्ट्रीय पंचांग</span><b>{indianDate(selected)}</b></div><p className="calendar-note"><b>पंचांग सूचना</b><br/>तिथि, नक्षत्र, योग, करण, राहुकाल और सूर्योदय स्थान तथा स्थानीय पंचांग के अनुसार बदलते हैं। इन्हें बिना प्रमाणित पंचांग स्रोत के अनुमान से नहीं दिखाया जा रहा है।</p><button className="primary" onClick={()=>{const d=new Date();setSelected(d);setView(new Date(d.getFullYear(),d.getMonth(),1))}}>आज की तारीख चुनें</button></aside>
    </div>
    <div className="panel calendar-footer-note"><b>ध्यान दें:</b> यह कैलेंडर अभी तारीख़ देखने और भारतीय राष्ट्रीय पंचांग की तारीख़ दिखाने के लिए है। धार्मिक तिथि/त्योहारों के सटीक विवरण के लिए प्रमाणित पंचांग डेटा और शहर/स्थान जोड़ना अगला चरण होगा।</div>
  </section>;
}
