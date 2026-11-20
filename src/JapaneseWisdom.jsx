import React, { useMemo, useState } from "react";

const PRINCIPLES = [
  { id:"kaizen", number:1, name:"KAIZEN", hindi:"काइज़ेन", tagline:"छोटी शुरुआत, निरंतर सुधार", subtitle:"हर दिन थोड़ा बेहतर बनें", icon:"🌱", meaning:"Kaizen का अर्थ है लगातार छोटे-छोटे सुधार करना। बड़े बदलाव की प्रतीक्षा करने के बजाय आज एक छोटा कदम उठाइए।", example:"यदि एक घंटा पढ़ना कठिन लगता है, तो दो मिनट से शुरुआत करें। फिर अपनी क्षमता के अनुसार धीरे-धीरे समय बढ़ाएं।", actions:["रोज़ एक छोटा नया ज्ञान सीखें।","अपनी एक आदत या गलती में सुधार करें।","बड़े लक्ष्य को छोटे, पूरे किए जा सकने वाले कदमों में बांटें।"], takeaway:"छोटी और लगातार कोशिशें समय के साथ बड़ा बदलाव ला सकती हैं।" },
  { id:"ikigai", number:2, name:"IKIGAI", hindi:"इकीगाई", tagline:"जीवन का उद्देश्य", subtitle:"सुबह उठने की सार्थक वजह खोजें", icon:"🌅", meaning:"Ikigai एक जापानी विचार है जो जीवन में अर्थ, उद्देश्य और रोज़मर्रा की संतुष्टि खोजने से जुड़ा है।", example:"आपको वेबसाइट बनाना पसंद है, आप उसमें कुशल बनते हैं और लोगों की समस्याएं हल करने वाली वेबसाइट बनाकर आजीविका कमाते हैं।", actions:["पहचानें कि आपको कौन-से काम सच में पसंद हैं।","अपने कौशल और जिन चीज़ों में आप अच्छे हैं, उनकी सूची बनाएं।","सोचें कि आपका काम दूसरों के लिए कैसे उपयोगी हो सकता है और टिकाऊ आजीविका कैसे बन सकती है।"], takeaway:"ऐसा उद्देश्य खोजें जिसमें रुचि, कौशल, उपयोगिता और आजीविका का संतुलन हो।" },
  { id:"oubaitori", number:3, name:"OUBAITORI", hindi:"ओबाइतोरी", tagline:"दूसरों से तुलना बंद करें", subtitle:"अपनी गति और अपनी यात्रा का सम्मान करें", icon:"🌸", meaning:"Oubaitori का संदेश है कि हर व्यक्ति का विकास अलग समय और अलग तरीके से होता है। अपनी यात्रा की तुलना किसी दूसरे की यात्रा से न करें।", example:"चेरी, आलूबुखारा और आड़ू अलग-अलग समय पर खिलते हैं। इसी तरह किसी को जल्दी सफलता मिलती है और किसी को देर से।", actions:["सोशल मीडिया देखकर खुद को कम न आंकें।","अपनी तुलना कल के अपने आप से करें।","हर सप्ताह अपनी छोटी प्रगति लिखें।"], takeaway:"आपकी जिंदगी आपकी अपनी यात्रा है; अपनी गति से आगे बढ़ें।" },
  { id:"shoshin", number:4, name:"SHOSHIN", hindi:"शोशिन", tagline:"शुरुआती विद्यार्थी की मानसिकता", subtitle:"हमेशा सीखने के लिए तैयार रहें", icon:"📚", meaning:"Shoshin का अर्थ है beginner's mind—खुले मन, जिज्ञासा और विनम्रता के साथ सीखना, चाहे आपका अनुभव कितना भी हो।", example:"कई साल से कंप्यूटर चलाने वाला व्यक्ति भी नई तकनीक सीखने और नए विचार सुनने के लिए तैयार रहता है।", actions:["हर दिन कुछ नया सीखें।","दूसरों की बात ध्यान से सुनें।","गलती होने पर उसे स्वीकारें और उससे सीखें।"], takeaway:"जब सीखना जारी रहता है, तब विकास के रास्ते खुले रहते हैं।" },
  { id:"shinrin-yoku", number:5, name:"SHINRIN-YOKU", hindi:"शिनरिन-योकू", tagline:"प्रकृति के साथ समय बिताना", subtitle:"प्रकृति को ध्यान से महसूस करें", icon:"🌳", meaning:"Shinrin-yoku को forest bathing कहा जाता है—प्रकृति में बिना जल्दबाज़ी के समय बिताना और अपनी इंद्रियों से वातावरण को महसूस करना।", example:"किसी सुरक्षित पार्क या हरित स्थान में 15–20 मिनट टहलें, पेड़ों, हवा और पक्षियों की आवाज़ पर ध्यान दें।", actions:["सुरक्षित हरित स्थान में समय बिताएं।","कुछ समय मोबाइल से दूर रहें।","धीरे चलें और आसपास की आवाज़ों, रंगों और हवा को महसूस करें।"], takeaway:"प्रकृति के साथ शांत समय बिताना मन को ठहराव और ताज़गी दे सकता है।" },
  { id:"wabi-sabi", number:6, name:"WABI-SABI", hindi:"वाबी-साबी", tagline:"अपूर्णता को स्वीकार करना", subtitle:"सादगी और अपूर्णता में सुंदरता देखें", icon:"🍵", meaning:"Wabi-sabi जापानी सौंदर्य-दृष्टि है जो सादगी, अपूर्णता और समय के साथ होने वाले बदलावों में सुंदरता देखती है।", example:"Kintsugi में टूटे मिट्टी के बर्तन को जोड़ने की कला दिखाई जाती है। दरारें छिपाने के बजाय उन्हें सुंदर ढंग से उभारा जाता है।", actions:["अपनी गलती स्वीकारें, उससे सीखें और आगे बढ़ें।","हर समय परफेक्ट दिखने का दबाव छोड़ें।","सादगी और छोटी चीज़ों में संतोष खोजें।"], takeaway:"परफेक्ट होना जरूरी नहीं; अपनी वास्तविकता को स्वीकार कर आगे बढ़ना जरूरी है।" },
  { id:"monozukuri", number:7, name:"MONOZUKURI", hindi:"मोनोज़ुकुरी", tagline:"अपने काम को कला समझें", subtitle:"लगन, कौशल और गुणवत्ता से काम करें", icon:"🪵", meaning:"Monozukuri का अर्थ केवल वस्तु बनाना नहीं, बल्कि कौशल, समर्पण, गुणवत्ता और निरंतर सुधार के साथ कुछ उपयोगी बनाना है।", example:"एक इंजीनियर केवल कोड नहीं लिखता, बल्कि भरोसेमंद सॉफ्टवेयर बनाता है। एक शिक्षक केवल पढ़ाता नहीं, बल्कि विद्यार्थियों के विकास में योगदान देता है।", actions:["काम को आधे मन से न करें।","गुणवत्ता और उपयोगकर्ता के अनुभव पर ध्यान दें।","अपने कौशल को लगातार बेहतर बनाएं।"], takeaway:"काम केवल आजीविका नहीं; यह अपनी प्रतिभा और जिम्मेदारी व्यक्त करने का माध्यम भी है।" }
];

const todayKey = () => {
  const d = new Date();
  return `shivasha_japanese_wisdom_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default function JapaneseWisdom() {
  const [expanded, setExpanded] = useState("kaizen");
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(todayKey()) || "[]"); } catch { return []; }
  });
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => PRINCIPLES.filter(p => (p.name+" "+p.hindi+" "+p.tagline+" "+p.meaning).toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const toggle = id => {
    const next = completed.includes(id) ? completed.filter(x => x !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem(todayKey(), JSON.stringify(next));
  };
  const share = async p => {
    const text = `SHIVASHA • Japanese Wisdom\n${p.number}. ${p.name} (${p.hindi})\n${p.tagline}\n\n${p.meaning}\n\nउदाहरण: ${p.example}\n\nआज की सीख: ${p.takeaway}`;
    try {
      if (navigator.share) await navigator.share({ title:`SHIVASHA • ${p.name}`, text });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); setNotice("सिद्धांत की जानकारी कॉपी हो गई।"); }
      else setNotice("इस डिवाइस पर शेयर सुविधा उपलब्ध नहीं है।");
    } catch (e) { if (e?.name !== "AbortError") setNotice("शेयर नहीं हो पाया।"); }
  };
  return <section className="content japanese-wisdom">
    <style>{`
      .jw-hero{background:linear-gradient(135deg,#172b3a,#315d52);color:#fff;border-radius:18px;padding:25px;margin-bottom:18px}
      .jw-hero .eyebrow{color:#d9e9dc}.jw-hero h2{font-size:clamp(24px,4vw,34px);margin:8px 0}.jw-hero p{color:#e1ece6;line-height:1.6;margin:0}
      .jw-progress{background:#fff;border:1px solid #e6eaf0;border-radius:14px;padding:16px 18px;margin-bottom:16px}
      .jw-track{height:9px;background:#edf0ec;border-radius:99px;overflow:hidden;margin-top:10px}.jw-track span{display:block;height:100%;background:#23845d;border-radius:99px;transition:width .2s}
      .jw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
      .jw-card{background:#fff;border:1px solid #e6eaf0;border-radius:14px;overflow:hidden}
      .jw-card-head{display:flex;align-items:center;gap:12px;padding:16px;cursor:pointer}
      .jw-icon{width:44px;height:44px;border-radius:12px;background:#f4f1e8;display:grid;place-items:center;font-size:24px;flex:0 0 auto}
      .jw-card-head h3{margin:0;font-size:16px}.jw-card-head p{margin:4px 0 0;color:#667085;font-size:13px}
      .jw-number{margin-left:auto;color:#8a93a2;font-weight:800;font-size:12px}
      .jw-detail{border-top:1px solid #eef1f5;padding:16px;line-height:1.65}.jw-detail h4{margin:12px 0 5px;font-size:13px;color:#315d52}.jw-detail p{margin:4px 0;color:#394456;font-size:14px}
      .jw-detail ul{padding-left:20px;margin:7px 0;color:#394456;font-size:14px}.jw-takeaway{background:#f3f7f2;border-radius:10px;padding:12px;margin-top:12px;font-weight:700;color:#294c3f}
      .jw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.jw-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#315d52;font-weight:700;margin-top:12px}
      .jw-check input{width:17px;height:17px;accent-color:#23845d}
      .jw-search{width:100%;padding:12px 14px;border:1px solid #dfe4ec;border-radius:10px;margin:0 0 14px;background:#fff}
      .jw-note{font-size:12px;color:#7b8494;line-height:1.5;margin-top:16px}
      @media(max-width:650px){.jw-grid{grid-template-columns:1fr}.jw-hero{padding:20px}.jw-card-head{padding:14px}}
    `}</style>
    <div className="jw-hero"><p className="eyebrow">SHIVASHA • SPIRITUAL & PERSONAL DEVELOPMENT</p><h2>🇯🇵 Japanese Wisdom</h2><p>जीवन को बेहतर बनाने के सात विचार — उद्देश्य, अनुशासन, सीखने, संतुलन और काम में उत्कृष्टता की दिशा में छोटे कदम।</p></div>
    <div className="jw-progress"><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><b>आज की अभ्यास-प्रगति</b><strong>{completed.length}/7 पूरे</strong></div><div className="jw-track"><span style={{width:`${completed.length/7*100}%`}}/></div><small style={{display:"block",marginTop:8,color:"#667085"}}>आपकी दैनिक चेकलिस्ट इसी डिवाइस के ब्राउज़र में सेव होती है।</small></div>
    <input className="jw-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="सिद्धांत खोजें — Kaizen, Ikigai..." aria-label="सिद्धांत खोजें"/>
    <div className="jw-grid">{visible.map(p=><article className="jw-card" key={p.id}>
      <div className="jw-card-head" role="button" tabIndex={0} onClick={()=>setExpanded(expanded===p.id?"":p.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setExpanded(expanded===p.id?"":p.id)}}}>
        <div className="jw-icon">{p.icon}</div><div><h3>{p.number}. {p.name} <span style={{fontWeight:500}}>({p.hindi})</span></h3><p>{p.tagline}</p></div><span className="jw-number">{expanded===p.id?"−":"＋"}</span>
      </div>
      {expanded===p.id&&<div className="jw-detail"><b>{p.subtitle}</b><h4>अर्थ</h4><p>{p.meaning}</p><h4>उदाहरण</h4><p>{p.example}</p><h4>दैनिक जीवन में प्रयोग</h4><ul>{p.actions.map(a=><li key={a}>{a}</li>)}</ul><div className="jw-takeaway">आज की सीख: {p.takeaway}</div><label className="jw-check"><input type="checkbox" checked={completed.includes(p.id)} onChange={()=>toggle(p.id)}/> आज इस सिद्धांत का अभ्यास किया</label><div className="jw-actions"><button className="secondary" onClick={()=>share(p)}>↗ शेयर करें</button></div></div>}
    </article>)}</div>
    {visible.length===0&&<div className="panel empty">कोई सिद्धांत नहीं मिला। दूसरा शब्द खोजें।</div>}
    {notice&&<p role="status" className="jw-note">{notice}</p>}
    <p className="jw-note">नोट: ये जापानी सांस्कृतिक विचार हैं, कोई चिकित्सकीय उपचार या सफलता की गारंटी नहीं। इन्हें अपनी परिस्थिति और सुविधा के अनुसार अपनाएं।</p>
  </section>;
}
