import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\\/$/, "");

const SECTIONS = {
  science: {
    eyebrow: "EXPLORE THE UNIVERSE",
    title: "Science & Discovery",
    description: "Understand the world through clear explainers, discoveries and trusted research.",
    icon: "🔬",
    topics: [
      {category:"SPACE",title:"Space, planets & the universe",description:"Explore planets, stars, missions, black holes and astronomy in approachable language.",links:[["NASA","https://www.nasa.gov/"],["ISRO","https://www.isro.gov.in/"],["ESA","https://www.esa.int/"]]},
      {category:"PHYSICS",title:"Physics & the laws of nature",description:"Learn about energy, matter, light, motion, quantum science and relativity.",links:[["CERN","https://home.cern/"],["Science News","https://www.sciencenews.org/"]]},
      {category:"LIFE SCIENCE",title:"Biology, health & environment",description:"Discover biodiversity, ecosystems, climate science and how living systems work.",links:[["WHO","https://www.who.int/"],["UN Environment Programme","https://www.unep.org/"]]},
      {category:"RESEARCH",title:"New discoveries & research",description:"Follow research updates and learn to distinguish evidence from speculation.",links:[["Nature","https://www.nature.com/"],["Science","https://www.science.org/"]]}
    ]
  },
  technology: {
    eyebrow: "IDEAS THAT SHAPE TOMORROW",
    title: "Technology & Innovation",
    description: "Explore AI, computing, cybersecurity, space technology and digital skills.",
    icon: "💻",
    topics: [
      {category:"ARTIFICIAL INTELLIGENCE",title:"AI & machine learning",description:"Understand generative AI, automation, machine learning and responsible use.",links:[["Stanford AI Index","https://aiindex.stanford.edu/"],["NIST AI","https://www.nist.gov/artificial-intelligence"]]},
      {category:"COMPUTING",title:"Software, apps & coding",description:"Explore programming, web development, open-source projects and cloud computing.",links:[["MDN Web Docs","https://developer.mozilla.org/"],["GitHub Explore","https://github.com/explore"]]},
      {category:"DIGITAL SAFETY",title:"Cybersecurity & privacy",description:"Learn about passwords, phishing, data privacy and safer online habits.",links:[["CERT-In","https://www.cert-in.org.in/"],["Stay Safe Online","https://www.staysafeonline.org/"]]},
      {category:"EMERGING TECH",title:"Robotics, chips & clean tech",description:"Track developments in robotics, semiconductors, batteries and renewable energy.",links:[["MIT Technology Review","https://www.technologyreview.com/"],["IEA","https://www.iea.org/"]]}
    ]
  },
  "current-affairs": {
    eyebrow: "STAY INFORMED",
    title: "Current Affairs",
    description: "Follow Indian and global developments using primary sources and reliable newsrooms.",
    icon: "📰",
    topics: [
      {category:"INDIA",title:"Government, policies & public updates",description:"Read official announcements, cabinet decisions, ministries' releases and public notices.",links:[["Press Information Bureau","https://pib.gov.in/"],["MyGov India","https://www.mygov.in/"],["Parliament of India","https://sansad.in/"]]},
      {category:"SCIENCE & SPACE",title:"Science, space & research news",description:"Follow mission updates, research announcements and science-related public information.",links:[["ISRO News","https://www.isro.gov.in/"],["DST India","https://dst.gov.in/"],["NASA News","https://www.nasa.gov/news/"]]},
      {category:"WORLD",title:"International affairs",description:"Read about international organisations, diplomacy, development and global challenges.",links:[["United Nations News","https://news.un.org/"],["WHO News","https://www.who.int/news"]]},
      {category:"ECONOMY",title:"Economy, business & data",description:"Check official statistics, monetary policy announcements and economic indicators.",links:[["Reserve Bank of India","https://www.rbi.org.in/"],["Ministry of Statistics","https://mospi.gov.in/"],["Economic Survey","https://www.indiabudget.gov.in/"]]}
    ]
  }
};

export default function KnowledgeHub({section = "science"}) {
  const data = SECTIONS[section] || SECTIONS.science;
  const [query,setQuery] = useState("");
  const [expanded,setExpanded] = useState("");
  const [language,setLanguage] = useState("English");
  const [news,setNews] = useState([]);
  const [newsLoading,setNewsLoading] = useState(false);
  const [newsError,setNewsError] = useState("");
  const [updatedAt,setUpdatedAt] = useState("");
  useEffect(()=>{
    let cancelled=false;
    const loadNews=async()=>{
      setNewsLoading(true);setNewsError("");
      try{
        const response=await fetch(API_BASE+"/api/news?section="+encodeURIComponent(section));
        const data=await response.json();
        if(!response.ok) throw new Error(data.message||"Could not load latest updates");
        if(!cancelled){setNews(data.items||[]);setUpdatedAt(data.updatedAt||"");}
      }catch(error){if(!cancelled)setNewsError(error.message||"News is temporarily unavailable");}
      finally{if(!cancelled)setNewsLoading(false);}
    };
    loadNews();
    const refreshTimer=setInterval(loadNews,5*60*1000);
    return()=>{cancelled=true;clearInterval(refreshTimer);};
  },[section]);
  const topics = useMemo(() => data.topics.filter(item => (item.title+" "+item.description+" "+item.category+" "+item.links.map(x=>x[0]).join(" ")).toLowerCase().includes(query.trim().toLowerCase())),[data,query]);
  return <section className="content knowledge-hub">
    <div className={"knowledge-hero knowledge-"+section}>
      <div className="knowledge-hero-icon" aria-hidden="true">{data.icon}</div>
      <div><span className="knowledge-eyebrow">{data.eyebrow}</span><h2>{data.title}</h2><p>{data.description}</p></div>
    </div>
    <div className="knowledge-toolbar">
      <label className="knowledge-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={"Search "+data.title.toLowerCase()+" topics..."}/></label>
      <div className="knowledge-language" aria-label="Reading language">
        <button className={language==="English"?"selected":""} onClick={()=>setLanguage("English")}>English</button>
        <button className={language==="Hindi"?"selected":""} onClick={()=>setLanguage("Hindi")}>हिंदी</button>
      </div>
    </div>
    <div className="knowledge-grid">
      {topics.map((item,index)=><article className="knowledge-card" key={item.title}>
        <div className="knowledge-card-top"><span className="knowledge-card-icon">{["✦","◈","◎","↗"][index%4]}</span><span className="knowledge-category">{item.category}</span></div>
        <h3>{item.title}</h3>
        <p>{language==="Hindi"?({
          "Space, planets & the universe":"अंतरिक्ष, ग्रहों, तारों, अंतरिक्ष अभियानों और ब्रह्मांड को सरल भाषा में जानें।",
          "Physics & the laws of nature":"ऊर्जा, पदार्थ, प्रकाश, गति और क्वांटम विज्ञान के सिद्धांत समझें।",
          "Biology, health & environment":"जैव विविधता, पारिस्थितिकी तंत्र, जलवायु और जीव विज्ञान के बारे में जानें।",
          "New discoveries & research":"नई वैज्ञानिक खोजों और शोध अपडेट को समझें।",
          "AI & machine learning":"जनरेटिव AI, ऑटोमेशन और मशीन लर्निंग को समझें।",
          "Software, apps & coding":"प्रोग्रामिंग, वेब डेवलपमेंट, ओपन-सोर्स और क्लाउड कंप्यूटिंग सीखें।",
          "Cybersecurity & privacy":"पासवर्ड सुरक्षा, फिशिंग, डेटा गोपनीयता और सुरक्षित इंटरनेट की आदतें सीखें।",
          "Robotics, chips & clean tech":"रोबोटिक्स, सेमीकंडक्टर, बैटरी और स्वच्छ ऊर्जा की तकनीक जानें।",
          "Government, policies & public updates":"सरकारी घोषणाओं, नीतियों, मंत्रालयों और सार्वजनिक सूचनाओं को आधिकारिक स्रोतों से पढ़ें।",
          "Science, space & research news":"अंतरिक्ष अभियानों, शोध घोषणाओं और विज्ञान से जुड़ी खबरें पढ़ें।",
          "International affairs":"अंतरराष्ट्रीय संगठनों, कूटनीति और वैश्विक मुद्दों की जानकारी लें।",
          "Economy, business & data":"आर्थिक आंकड़े, मौद्रिक नीति और अर्थव्यवस्था से जुड़ी आधिकारिक जानकारी देखें।"
        })[item.title]||item.description:item.description}</p>
        <button className="knowledge-expand" onClick={()=>setExpanded(expanded===item.title?"":item.title)} aria-expanded={expanded===item.title}>{expanded===item.title?"Hide trusted sources":"Explore trusted sources"} <span>{expanded===item.title?"−":"↗"}</span></button>
        {expanded===item.title&&<div className="knowledge-links">{item.links.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}<span aria-hidden="true"> ↗</span></a>)}</div>}
      </article>)}
    </div>
    {topics.length===0&&<div className="knowledge-empty"><span>⌕</span><h3>No matching topics</h3><p>Try another keyword.</p></div>}
    <section className="knowledge-live">
      <div className="knowledge-live-head"><div><span className="knowledge-eyebrow">LATEST UPDATES</span><h3>Live {section==="current-affairs"?"Current Affairs":section==="technology"?"Technology":"Science"} Feed</h3><p>Recent items from external publisher feeds.</p></div><button className="secondary" onClick={()=>{setNewsError("");setNewsLoading(true);fetch(API_BASE+"/api/news?section="+encodeURIComponent(section)).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Refresh failed");setNews(d.items||[]);setUpdatedAt(d.updatedAt||"");}).catch(e=>setNewsError(e.message)).finally(()=>setNewsLoading(false));}}>↻ Refresh</button></div>
      {newsLoading&&news.length===0?<div className="knowledge-feed-status">Loading latest updates…</div>:null}
      {newsError&&<div className="knowledge-feed-status">{newsError}. Some publisher feeds may be temporarily unavailable.</div>}
      {!newsLoading&&news.length===0&&!newsError&&<div className="knowledge-feed-status">No live items are available right now. Try refreshing in a moment.</div>}
      {news.length>0&&<div className="knowledge-news-list">{news.map((item,index)=><article className="knowledge-news-item" key={item.url+index}><div className="knowledge-news-meta"><span>{item.source}</span><span>{item.date&&Number.isFinite(Date.parse(item.date))?new Date(item.date).toLocaleString([],{dateStyle:"medium",timeStyle:"short"}):"Latest update"}</span></div><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<span aria-hidden="true"> ↗</span></a>{item.description&&<p>{item.description}</p>}</article>)}</div>}
      {updatedAt&&<small className="knowledge-updated">Feed checked {new Date(updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}. External feed availability may vary.</small>}
    </section>
    <div className="knowledge-note"><b>Editorial note</b><p>News is fetched from external RSS/Atom feeds and may be delayed or unavailable. Always open the original publisher link and verify the publication date before relying on time-sensitive information.</p></div>
  </section>;
}
