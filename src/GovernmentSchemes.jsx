import React, { useMemo, useState } from "react";
import "./GovernmentSchemes.css";

const SCHEMES = [
  { id:"myscheme", title:"myScheme — सरकारी योजना खोजें", level:"all", category:"सभी योजनाएँ", description:"अपनी उम्र, राज्य, आय और अन्य पात्रता के आधार पर केंद्र व राज्य सरकार की योजनाएँ खोजें।", url:"https://www.myscheme.gov.in/", official:"भारत सरकार का राष्ट्रीय योजना प्लेटफ़ॉर्म", featured:true },
  { id:"india", title:"भारत सरकार — योजना निर्देशिका", level:"central", category:"सभी योजनाएँ", description:"सरकारी योजनाओं, लाभ, पात्रता और आवेदन प्रक्रिया की आधिकारिक जानकारी।", url:"https://www.india.gov.in/my-government/schemes", official:"National Portal of India" },
  { id:"scholarship", title:"National Scholarship Portal", level:"central", category:"शिक्षा", description:"केंद्र और राज्य की उपलब्ध छात्रवृत्ति योजनाएँ और आवेदन स्थिति देखें।", url:"https://scholarships.gov.in/", official:"भारत सरकार" },
  { id:"msme", title:"MSME Incentive Calculator", level:"state", category:"व्यवसाय / सब्सिडी", description:"उत्तर प्रदेश के MSME उद्यमों के लिए वित्तीय सहायता, सब्सिडी, प्रशिक्षण और प्रोत्साहन की जानकारी।", url:"https://msme1connect.up.gov.in/Incentive/Index", official:"उत्तर प्रदेश सरकार" },
  { id:"investup", title:"Invest UP — उद्योग व निवेश प्रोत्साहन", level:"state", category:"व्यवसाय / सब्सिडी", description:"उत्तर प्रदेश की उद्योग नीतियाँ, पात्र निवेश प्रोत्साहन और सरकारी आदेश देखें।", url:"https://invest.up.gov.in/policies/", official:"Invest UP, उत्तर प्रदेश सरकार" },
  { id:"agriculture", title:"UP कृषि विभाग — योजनाएँ", level:"state", category:"किसान", description:"कृषि विभाग की योजनाओं, कृषि सहायता और किसान सेवाओं की जानकारी।", url:"https://agridarshan.up.gov.in/", official:"कृषि विभाग, उत्तर प्रदेश सरकार" },
  { id:"kanyasumangala", title:"मुख्यमंत्री कन्या सुमंगला योजना", level:"state", category:"महिला एवं बालिका", description:"उत्तर प्रदेश की कन्या सुमंगला योजना के नियम, पात्रता और आधिकारिक पोर्टल।", url:"https://mksy.up.gov.in/", official:"उत्तर प्रदेश सरकार" },
  { id:"health", title:"UP स्वास्थ्य विभाग — योजनाएँ", level:"state", category:"स्वास्थ्य", description:"स्वास्थ्य विभाग की योजनाओं और जन-स्वास्थ्य सेवाओं की आधिकारिक जानकारी।", url:"https://dgmh.up.gov.in/", official:"चिकित्सा एवं स्वास्थ्य विभाग, उत्तर प्रदेश सरकार" },
  { id:"services", title:"National Government Services Portal", level:"central", category:"सरकारी सेवाएँ", description:"केंद्र और राज्य के सरकारी सेवा पोर्टल खोजें; राज्य/जिला के अनुसार सेवाएँ ढूँढें।", url:"https://services.india.gov.in/", official:"NIC, इलेक्ट्रॉनिक्स एवं IT मंत्रालय" }
];

const CATEGORIES = ["सभी","किसान","शिक्षा","स्वास्थ्य","महिला एवं बालिका","व्यवसाय / सब्सिडी","सरकारी सेवाएँ","सभी योजनाएँ"];

export default function GovernmentSchemes() {
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("सभी");
  const [state, setState] = useState("Uttar Pradesh");
  const [query, setQuery] = useState("");
  const isUP = state === "Uttar Pradesh";
  const visible = useMemo(() => SCHEMES.filter(item => {
    const levelMatch = level === "all" || item.level === "all" || item.level === level;
    const categoryMatch = category === "सभी" || item.category === category;
    const q = query.trim().toLowerCase();
    const queryMatch = !q || [item.title,item.description,item.category,item.official].join(" ").toLowerCase().includes(q);
    return levelMatch && categoryMatch && queryMatch && (isUP || item.level !== "state" || item.id === "myscheme");
  }), [level, category, query, isUP]);

  return <section className="content gov-schemes">
    <div className="gov-hero">
      <div className="gov-emblem" aria-hidden="true">🇮🇳</div>
      <div><span className="gov-kicker">SHIVASHA • जन सहायता केंद्र</span><h2>सरकारी सब्सिडी और सहायता योजनाएँ</h2><p>केंद्र और राज्य सरकार की योजनाएँ, पात्रता की जानकारी और आधिकारिक आवेदन लिंक एक जगह।</p></div>
    </div>
    <div className="gov-notice"><b>ज़रूरी सूचना:</b> SHIVASHA केवल आधिकारिक पोर्टल के लिंक उपलब्ध कराता है। पात्रता, राशि, अंतिम तिथि और आवेदन की पुष्टि संबंधित सरकारी वेबसाइट पर करें। किसी एजेंट को पैसे या OTP न दें।</div>
    <div className="gov-controls">
      <label>राज्य / केंद्रशासित प्रदेश<select value={state} onChange={e=>{setState(e.target.value);setLevel("all");setCategory("सभी")}}>{["Uttar Pradesh","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh","Andaman and Nicobar Islands","Dadra and Nagar Haveli and Daman and Diu","Lakshadweep"].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>योजना खोजें<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="जैसे किसान, छात्रवृत्ति, व्यवसाय…" /></label>
    </div>
    <div className="gov-filter-row" aria-label="योजना का स्तर">{[["all","सभी योजनाएँ"],["central","केंद्र सरकार"],["state","राज्य सरकार"]].map(([v,label])=><button key={v} className={level===v?"gov-filter active":"gov-filter"} onClick={()=>setLevel(v)}>{label}</button>)}</div>
    <div className="gov-category-row">{CATEGORIES.map(c=><button key={c} className={category===c?"gov-chip active":"gov-chip"} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    {!isUP&&<div className="gov-state-note">चुना गया राज्य: <b>{state}</b>। सभी राज्यों की नवीनतम योजनाएँ देखने के लिए myScheme पर राज्य चुनें। नीचे उत्तर प्रदेश के विशेष लिंक केवल Uttar Pradesh चुनने पर दिखते हैं।</div>}
    <div className="gov-card-grid">{visible.map(item=><article className={item.featured?"gov-card featured":"gov-card"} key={item.id}>
      <div className="gov-card-top"><span className="gov-card-level">{item.level==="central"?"केंद्र सरकार":item.level==="state"?(isUP?"उत्तर प्रदेश सरकार":"राज्य सरकार"):"केंद्र + राज्य"}</span><span className="gov-card-icon" aria-hidden="true">{item.category==="किसान"?"🌾":item.category==="शिक्षा"?"🎓":item.category==="स्वास्थ्य"?"🏥":item.category==="महिला एवं बालिका"?"👩":item.category==="व्यवसाय / सब्सिडी"?"🏭":"📄"}</span></div>
      <h3>{item.title}</h3><p>{item.description}</p><small>{item.official}</small><a className="gov-open-link" href={item.url} target="_blank" rel="noreferrer">आधिकारिक वेबसाइट खोलें ↗</a>
    </article>)}</div>
    {visible.length===0&&<div className="panel empty">इस खोज में कोई लिंक नहीं मिला। दूसरा शब्द या “सभी योजनाएँ” चुनें।</div>}
    <div className="gov-footer"><b>पात्रता जाँचने का सबसे अच्छा तरीका</b><p>myScheme पर अपनी जानकारी भरकर केंद्र और राज्य दोनों की योजनाएँ खोजें। योजना का लाभ अपने-आप मंज़ूर नहीं होता; संबंधित विभाग के नियम लागू होंगे।</p><a href="https://www.myscheme.gov.in/find-scheme" target="_blank" rel="noreferrer">पात्रता जाँचें ↗</a></div>
  </section>;
}
