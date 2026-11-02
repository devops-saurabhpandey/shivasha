import React, { useMemo, useState } from "react";

const STUTIS = [
 { deity:"श्री गणेश", title:"गणेश वन्दना", sanskrit:"वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥", meaning:"हे विशालकाय, वक्रतुण्ड और करोड़ों सूर्यों के समान तेजस्वी गणेशजी! मेरे सभी कार्य सदा विघ्नरहित करें।" },
 { deity:"भगवान शिव", title:"शिव पंचाक्षर स्तोत्र", sanskrit:"नागेन्द्रहाराय त्रिलोचनाय\nभस्माङ्गरागाय महेश्वराय।\nनित्याय शुद्धाय दिगम्बराय\nतस्मै नकाराय नमः शिवाय॥", meaning:"नागराज का हार धारण करने वाले, तीन नेत्रों वाले, भस्म से विभूषित, नित्य और शुद्ध महेश्वर को नमस्कार।" },
 { deity:"भगवान विष्णु", title:"शान्ताकारं भुजगशयनम्", sanskrit:"शान्ताकारं भुजगशयनं पद्मनाभं सुरेशं\nविश्वाधारं गगनसदृशं मेघवर्णं शुभाङ्गम्।\nलक्ष्मीकान्तं कमलनयनं योगिभिर्ध्यानगम्यं\nवन्दे विष्णुं भवभयहरं सर्वलोकैकनाथम्॥", meaning:"शांत स्वरूप, शेषनाग पर शयन करने वाले, समस्त विश्व के आधार और संसार के भय को दूर करने वाले भगवान विष्णु को प्रणाम।" },
 { deity:"माँ दुर्गा", title:"दुर्गा स्तुति", sanskrit:"सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरी नारायणि नमोऽस्तु ते॥", meaning:"हे सभी मंगलों की मंगलमयी, कल्याणकारी, सभी उद्देश्यों को पूर्ण करने वाली, शरण देने वाली नारायणी! आपको नमस्कार।" },
 { deity:"माँ सरस्वती", title:"सरस्वती वन्दना", sanskrit:"या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता।\nया वीणावरदण्डमण्डितकरा या श्वेतपद्मासना॥", meaning:"जो कुन्द, चन्द्रमा और हिम के समान उज्ज्वल हैं, श्वेत वस्त्र धारण करती हैं, वीणा से सुशोभित हैं और श्वेत कमल पर विराजती हैं—उन माँ सरस्वती का स्मरण।" },
 { deity:"श्रीराम", title:"श्रीराम स्मरण", sanskrit:"श्रीरामचन्द्र कृपालु भजु मन हरण भवभय दारुणम्।\nनवकञ्जलोचन कञ्जमुख करकञ्ज पदकञ्जारुणम्॥", meaning:"हे मन! करुणामय श्रीराम का भजन करो, जो संसार के कठिन भय को दूर करते हैं और जिनके नेत्र, मुख, हाथ तथा चरण कमल के समान हैं।" },
 { deity:"श्रीकृष्ण", title:"श्रीकृष्ण वन्दना", sanskrit:"वसुदेवसुतं देवं कंसचाणूरमर्दनम्।\nदेवकीपरमानन्दं कृष्णं वन्दे जगद्गुरुम्॥", meaning:"वसुदेव के पुत्र, कंस और चाणूर का संहार करने वाले, देवकी को परम आनंद देने वाले जगद्गुरु श्रीकृष्ण को प्रणाम।" },
 { deity:"भगवान सूर्य", title:"सूर्य नमस्कार", sanskrit:"जपाकुसुमसङ्काशं काश्यपेयं महाद्युतिम्।\nतमोऽरिं सर्वपापघ्नं प्रणतोऽस्मि दिवाकरम्॥", meaning:"जपा पुष्प के समान लालिमा वाले, कश्यप पुत्र, महान तेजस्वी, अंधकार के शत्रु और दिवाकर सूर्यदेव को प्रणाम।" }
];

export default function DailyDevStuti() {
 const today = new Date();
 const [selected, setSelected] = useState("today");
 const index = Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000) % STUTIS.length;
 const item = selected === "today" ? STUTIS[index] : STUTIS[Number(selected)];
 const copy = async () => { try { await navigator.clipboard.writeText(item.title+"\n"+item.sanskrit+"\n\nहिंदी अर्थ: "+item.meaning); } catch {} };
 return <section className="content narrow">
  <div className="feed-head"><div><h2>🪔 Daily Dev Stuti</h2><p>दैनिक देव स्तुति · संस्कृत पाठ और सरल हिंदी अर्थ</p></div></div>
  <article className="panel" style={{textAlign:"center",background:"linear-gradient(145deg,#fffaf0,#fff)",border:"1px solid #ead8ae"}}>
   <div style={{fontSize:12,fontWeight:800,color:"#a66b13",letterSpacing:".08em"}}>आज की स्तुति · {today.toLocaleDateString("hi-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
   <h2 style={{margin:"12px 0 4px"}}>{item.deity}</h2><h3>{item.title}</h3>
   <div lang="sa" style={{whiteSpace:"pre-line",fontSize:18,lineHeight:2,fontWeight:600,margin:"22px auto",maxWidth:650}}>{item.sanskrit}</div>
   <div style={{textAlign:"left",borderTop:"1px solid #ead8ae",paddingTop:16,marginTop:16}}>
    <b>सरल हिंदी अर्थ</b><p style={{lineHeight:1.8}}>{item.meaning}</p>
   </div>
   <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:12}}>
    <button className="primary" onClick={copy}>स्तुति कॉपी करें</button>
    <button className="secondary" onClick={()=>window.print()}>प्रिंट / PDF</button>
   </div>
  </article>
  <div className="panel"><h3>अन्य देव स्तुतियाँ</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{STUTIS.map((s,i)=><button key={s.deity} className={selected===String(i)?"primary":"secondary"} onClick={()=>setSelected(String(i))}>{s.deity}</button>)}<button className="secondary" onClick={()=>setSelected("today")}>आज की स्तुति</button></div></div>
  <p className="muted" style={{fontSize:12}}>नोट: कुछ स्तुतियों के पाठ में परंपरा के अनुसार पाठांतर मिल सकते हैं।</p>
 </section>;
}
