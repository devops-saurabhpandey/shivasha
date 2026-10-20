import React, { useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "") + "/api/calendar";
const WEEKDAYS = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTHS = ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"];
const CITIES = [
  { label: "कानपुर", value: "kanpur" },
  { label: "लखनऊ", value: "lucknow" },
  { label: "वाराणसी", value: "varanasi" },
  { label: "नई दिल्ली", value: "new-delhi" },
  { label: "प्रयागराज", value: "prayagraj" },
  { label: "पटना", value: "patna" },
  { label: "जयपुर", value: "jaipur" },
  { label: "भोपाल", value: "bhopal" },
  { label: "मुंबई", value: "mumbai" },
  { label: "कोलकाता", value: "kolkata" },
  { label: "चेन्नई", value: "chennai" },
  { label: "बेंगलुरु", value: "bengaluru" },
  { label: "हैदराबाद", value: "hyderabad" }
];
const formatLong = d => new Intl.DateTimeFormat("hi-IN", {weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d);
const isoDate = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
const indianDate = d => {
  try { return new Intl.DateTimeFormat("hi-IN-u-ca-indian", {day:"numeric",month:"long",year:"numeric"}).format(d); }
  catch { return "उपलब्ध नहीं"; }
};
const titleCase = s => String(s || "").replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const findValue = (obj, names) => {
  if (!obj || typeof obj !== "object") return null;
  for (const name of names) {
    const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase());
    if (key && obj[key] != null) return obj[key];
  }
  return null;
};
const formatValue = value => {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") {
    const name = value.nameHi || value.name_hi || value.hi || value.hindi || value.name || value.label || value.value;
    if (name && typeof name !== "object") return String(name);
    return Object.entries(value).filter(([,v]) => v != null && typeof v !== "object").map(([k,v]) => titleCase(k) + ": " + v).join(" · ") || "—";
  }
  return String(value);
};
const getPayload = json => json?.data ?? json?.result ?? json;

const findArrays = (obj, wanted, out = []) => {
  if (!obj || typeof obj !== "object") return out;
  for (const [key, value] of Object.entries(obj)) {
    if (wanted.some(name => key.toLowerCase().replace(/[_-]/g, "") === name.toLowerCase().replace(/[_-]/g, "")) && Array.isArray(value)) out.push(...value);
    if (value && typeof value === "object") findArrays(value, wanted, out);
  }
  return out;
};
const getShubhPeriods = panchang => {
  const raw = findArrays(panchang, ["choghadiya", "dayChoghadiya", "nightChoghadiya", "day_choghadiya", "night_choghadiya"]);
  const seen = new Set();
  return raw.filter(item => {
    if (!item || typeof item !== "object") return false;
    const name = String(findValue(item, ["name", "type", "label", "muhurat", "quality"]) || "");
    const good = /amrit|labh|shubh|char|auspicious|good/i.test(name);
    const start = findValue(item, ["start", "startTime", "start_time", "from"]);
    const end = findValue(item, ["end", "endTime", "end_time", "to"]);
    if (!good || !start || !end) return false;
    const key = name + "|" + start + "|" + end;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(item => ({
    name: formatValue(findValue(item, ["nameHi", "name_hi", "hi", "hindi", "name", "type", "label", "muhurat", "quality"])),
    start: formatTime(findValue(item, ["start", "startTime", "start_time", "from"])),
    end: formatTime(findValue(item, ["end", "endTime", "end_time", "to"]))
  }));
};
const formatTime = value => {
  if (value == null) return "—";
  const text = String(value);
  const match = text.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return text;
};

const getFestivalList = json => {
  const data = getPayload(json);
  if (Array.isArray(data)) return data;
  for (const key of ["festivals", "occurrences", "items", "vrats", "events"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
};

export default function HinduCalendar() {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [city, setCity] = useState("kanpur");
  const [panchang, setPanchang] = useState(null);
  const [panchangStatus, setPanchangStatus] = useState("loading");
  const [panchangError, setPanchangError] = useState("");
  const [festivals, setFestivals] = useState([]);
  const [festivalStatus, setFestivalStatus] = useState("loading");
  const [festivalError, setFestivalError] = useState("");
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = first.getDay();
    const count = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({length:count},(_,i)=>new Date(view.getFullYear(),view.getMonth(),i+1))];
  }, [view]);
  const move = n => setView(new Date(view.getFullYear(), view.getMonth()+n, 1));
  const isSame = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  useEffect(() => {
    const controller = new AbortController();
    setPanchangStatus("loading"); setPanchangError(""); setPanchang(null);
    fetch(API + "/panchang?city=" + encodeURIComponent(city) + "&date=" + isoDate(selected), {signal: controller.signal})
      .then(async response => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || json.message || "पंचांग डेटा अभी उपलब्ध नहीं है।");
        return json;
      })
      .then(json => { setPanchang(getPayload(json)); setPanchangStatus("ready"); })
      .catch(error => { if (error.name !== "AbortError") { setPanchangError(error.message || "पंचांग डेटा लोड नहीं हो सका।"); setPanchangStatus("error"); } });
    return () => controller.abort();
  }, [city, selected]);

  useEffect(() => {
    const controller = new AbortController();
    setFestivalStatus("loading"); setFestivalError(""); setFestivals([]);
    let retryTimer;
    const load = async () => {
      try {
        const response = await fetch(API + "/festivals?city=" + encodeURIComponent(city) + "&year=" + view.getFullYear(), {signal: controller.signal});
        const json = await response.json().catch(() => ({}));
        if (response.status === 202) {
          setFestivalStatus("computing");
          retryTimer = setTimeout(load, 10000);
          return;
        }
        if (!response.ok) throw new Error(json.error || json.message || "त्योहारों की सूची अभी उपलब्ध नहीं है।");
        setFestivals(getFestivalList(json));
        setFestivalStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") { setFestivalError(error.message || "त्योहारों की सूची लोड नहीं हो सकी।"); setFestivalStatus("error"); }
      }
    };
    load();
    return () => { controller.abort(); clearTimeout(retryTimer); };
  }, [city, view.getFullYear()]);

  const panchangRows = panchang ? [
    ["तिथि", findValue(panchang, ["tithi", "tithiName"])],
    ["नक्षत्र", findValue(panchang, ["nakshatra", "nakshatraName"])],
    ["योग", findValue(panchang, ["yoga"])],
    ["करण", findValue(panchang, ["karana", "karan"])],
    ["सूर्योदय", findValue(panchang, ["sunrise", "sunRise"])],
    ["सूर्यास्त", findValue(panchang, ["sunset", "sunSet"])],
    ["राहुकाल", findValue(panchang, ["rahuKaal", "rahu_kala", "rahuKalam"])],
    ["यमगण्ड", findValue(panchang, ["yamaganda", "yamaGanda"])],
    ["गुलिक काल", findValue(panchang, ["gulika", "gulikaKaal", "gulikaKala"])],
    ["चंद्र मास", findValue(panchang, ["lunarMonth", "amanta", "purnimanta"])]
  ].filter(([,value]) => value != null) : [];

  const selectedCity = CITIES.find(c => c.value === city)?.label || city;
  const shubhPeriods = getShubhPeriods(panchang);
  const abhijit = panchang ? findValue(panchang, ["abhijitMuhurta", "abhijit_muhurta", "abhijit"]) : null;
  const monthFestivals = festivals.filter(item => {
    const date = findValue(item, ["date", "gregorianDate", "gregorian_date"]);
    if (!date) return true;
    return String(date).slice(0,7) === isoDate(view).slice(0,7);
  }).slice(0, 20);

  return <section className="content hindu-calendar">
    <div className="feed-head"><div><span className="feed-kicker">SHIVASHA · भारतीय संस्कृति</span><h2>🪔 हिंदू कैलेंडर</h2><p>तारीख, पंचांग, व्रत और त्योहार देखें।</p></div><div className="calendar-top-actions"><label className="calendar-city-label">स्थान<select value={city} onChange={e=>setCity(e.target.value)}>{CITIES.map(c=><option value={c.value} key={c.value}>{c.label}</option>)}</select></label><button className="secondary" onClick={()=>{const d=new Date();setView(new Date(d.getFullYear(),d.getMonth(),1));setSelected(d)}}>आज पर जाएँ</button></div></div>
    <div className="hindu-calendar-grid">
      <div className="panel calendar-month">
        <div className="calendar-controls"><button className="secondary" onClick={()=>move(-1)} aria-label="पिछला महीना">‹</button><h3>{MONTHS[view.getMonth()]} {view.getFullYear()}</h3><button className="secondary" onClick={()=>move(1)} aria-label="अगला महीना">›</button></div>
        <div className="calendar-days">{WEEKDAYS.map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{days.map((d,i)=>d?<button key={d.toISOString()} className={"calendar-day"+(isSame(d,today)?" today":"")+(isSame(d,selected)?" selected":"")} onClick={()=>setSelected(d)} aria-pressed={isSame(d,selected)}>{d.getDate()}</button>:<span className="calendar-day blank" key={"blank-"+i}/>)}</div>
        <div className="calendar-legend"><span><i className="today-dot"/> आज</span><span>तारीख चुनकर पंचांग देखें</span></div>
      </div>
      <aside className="panel calendar-detail"><div className="calendar-diya">🪔</div><span className="eyebrow">चुनी हुई तारीख · {selectedCity}</span><h3>{formatLong(selected)}</h3><div className="calendar-info-row"><span>भारतीय राष्ट्रीय पंचांग</span><b>{indianDate(selected)}</b></div>
        <h4 className="calendar-section-title">आज का पंचांग</h4>
        {panchangStatus === "loading" && <p className="muted">पंचांग लोड हो रहा है…</p>}
        {panchangStatus === "error" && <p className="calendar-note" role="status">पंचांग डेटा नहीं मिल पाया। {panchangError} तारीख और कैलेंडर फिर भी इस्तेमाल कर सकते हैं।</p>}
        {panchangStatus === "ready" && (panchangRows.length ? <div className="calendar-panchang-grid">{panchangRows.map(([label,value])=><div className="calendar-panchang-item" key={label}><span>{label}</span><b>{formatValue(value)}</b></div>)}</div> : <p className="muted">इस तारीख के लिए पंचांग विवरण उपलब्ध नहीं है।</p>)}
        <div className="calendar-shubh-muhurat">
          <h4 className="calendar-section-title">✨ शुभ मुहूर्त</h4>
          {panchangStatus === "loading" && <p className="muted">शुभ समय की गणना लोड हो रही है…</p>}
          {panchangStatus === "error" && <p className="muted">शुभ मुहूर्त देखने के लिए पहले पंचांग डेटा उपलब्ध होना चाहिए।</p>}
          {panchangStatus === "ready" && <>
            {abhijit && typeof abhijit === "object" && <div className="calendar-muhurat-item"><span>अभिजीत मुहूर्त</span><b>{formatTime(findValue(abhijit, ["start", "startTime", "start_time"]))} – {formatTime(findValue(abhijit, ["end", "endTime", "end_time"]))}</b></div>}
            {shubhPeriods.map((period, index) => <div className="calendar-muhurat-item" key={period.name + index}><span>{period.name}</span><b>{period.start} – {period.end}</b></div>)}
            {!abhijit && shubhPeriods.length === 0 && <p className="muted">इस तारीख के लिए शुभ मुहूर्त का अलग समय स्रोत से उपलब्ध नहीं है। गलत समय दिखाने के बजाय विवरण छिपाया गया है।</p>}
          </>}
          <small className="calendar-source">शुभ समय चुने हुए शहर के पंचांग/चौघड़िया डेटा पर आधारित हैं। विवाह, गृह प्रवेश या अन्य बड़े अनुष्ठानों के मुहूर्त के लिए स्थानीय पंचांग से पुष्टि करें।</small>
        </div>
        <p className="calendar-source">पंचांग डेटा: <a href="https://astrotathya.com/developers" target="_blank" rel="noreferrer">AstroTathya</a> · शहर बदलने पर समय बदल सकता है।</p>
      </aside>
    </div>
    <div className="panel calendar-festivals"><div className="panel-head"><h3>🎉 {MONTHS[view.getMonth()]} के व्रत और त्योहार</h3><span>{selectedCity}</span></div>
      {festivalStatus === "loading" && <p className="muted">त्योहारों की सूची लोड हो रही है…</p>}
      {festivalStatus === "computing" && <p className="muted">इस शहर की वार्षिक त्योहार सूची तैयार हो रही है। कुछ सेकंड में अपने-आप दोबारा कोशिश होगी…</p>}
      {festivalStatus === "error" && <p className="muted">त्योहारों की सूची उपलब्ध नहीं है। {festivalError}</p>}
      {festivalStatus === "ready" && (monthFestivals.length ? <div className="calendar-festival-list">{monthFestivals.map((item,index)=>{
        const date = findValue(item, ["date", "gregorianDate", "gregorian_date"]);
        const name = findValue(item, ["nameHi", "name_hi", "hindi", "name", "festival", "title"]) || "व्रत / त्योहार";
        const english = findValue(item, ["nameEn", "name_en", "english"]);
        return <div className="calendar-festival-item" key={String(date||"event")+"-"+index}><b>{date ? new Intl.DateTimeFormat("hi-IN",{day:"numeric",month:"short"}).format(new Date(String(date).slice(0,10)+"T12:00:00")) : "तिथि"}</b><span>{formatValue(name)}{english && String(english)!==String(name) ? <small>{formatValue(english)}</small> : null}</span></div>;
      })}</div> : <p className="muted">इस महीने की सूची उपलब्ध नहीं है या इस स्रोत से कोई प्रविष्टि नहीं मिली।</p>)}
      <p className="calendar-source">त्योहारों की तिथियाँ शहर और परंपरा के अनुसार अलग हो सकती हैं। स्रोत: <a href="https://astrotathya.com/developers" target="_blank" rel="noreferrer">AstroTathya API</a>.</p>
    </div>
    <div className="panel calendar-footer-note"><b>ध्यान दें:</b> पंचांग की गणना चुने हुए शहर और स्रोत के अनुसार है। महत्वपूर्ण धार्मिक अनुष्ठानों के लिए स्थानीय परंपरा/पंचांग से भी पुष्टि करें।</div>
  </section>;
}
