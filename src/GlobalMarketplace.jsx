import React, { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const DEPARTMENTS = [
  "AI Services", "Web & Software", "Global Projects", "Business Directory",
  "Freelancers & Experts", "Education & Skill Development", "Finance & Insurance",
  "E-commerce & Suppliers"
];
const styles = {
  card: { background:"#fff", border:"1px solid #e5eaf1", borderRadius:16, padding:18, boxShadow:"0 4px 18px rgba(15,23,42,.04)" },
  input: { width:"100%", padding:"11px 12px", border:"1px solid #dbe2ea", borderRadius:10, background:"#fff", color:"#172033", boxSizing:"border-box", font:"inherit" },
  button: { padding:"10px 14px", border:0, borderRadius:10, background:"#4f46e5", color:"#fff", fontWeight:750, cursor:"pointer" }
};
function Field({label, ...props}) {
  return <label style={{display:"grid", gap:6, fontSize:13, fontWeight:700, color:"#475569"}}>{label}<input style={styles.input} {...props}/></label>;
}
export default function GlobalMarketplace({auth}) {
  const [listings,setListings]=useState([]);
  const [mine,setMine]=useState([]);
  const [inquiries,setInquiries]=useState([]);
  const [query,setQuery]=useState("");
  const [department,setDepartment]=useState("");
  const [tab,setTab]=useState("discover");
  const [notice,setNotice]=useState("Loading marketplace…");
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:"",department:"AI Services",description:"",category:"",country:"India",priceFrom:"",currency:"USD"});
  const [messages,setMessages]=useState({});
  const headers={"Content-Type":"application/json",...(auth?.token?{Authorization:"Bearer "+auth.token}:{})};
  const request=useCallback(async(path,options={})=>{
    const response=await fetch(API_BASE+path,{...options,headers:{...headers,...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.message||"Marketplace request failed.");
    return body;
  },[auth?.token]);
  const load=useCallback(async()=>{
    setBusy(true);
    try {
      const [publicData,ownData,inquiryData]=await Promise.all([
        request("/api/business-platform/marketplace/listings"),
        request("/api/business-platform/marketplace/my-listings"),
        request("/api/business-platform/marketplace/inquiries")
      ]);
      setListings(publicData.listings||[]);
      setMine(ownData.listings||[]);
      setInquiries(inquiryData.inquiries||[]);
      setNotice("Marketplace connected. Listings and inquiries are stored on the Shivasha server.");
    } catch(error) { setNotice(error.message||"Could not load marketplace."); }
    finally { setBusy(false); }
  },[request]);
  useEffect(()=>{load();},[load]);
  const createListing=async e=>{
    e.preventDefault();
    if(!form.title.trim()||!form.description.trim()) return;
    setBusy(true);
    try {
      await request("/api/business-platform/marketplace/listings",{method:"POST",body:JSON.stringify(form)});
      setForm({...form,title:"",description:"",category:"",priceFrom:""});
      setNotice("Your service listing is published and visible to signed-in Shivasha users.");
      setTab("my-listings");
      await load();
    } catch(error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  const sendInquiry=async listing=>{
    const message=(messages[listing._id]||"").trim();
    if(message.length<10){setNotice("Please describe your requirement in at least 10 characters.");return;}
    setBusy(true);
    try {
      await request("/api/business-platform/marketplace/inquiries",{method:"POST",body:JSON.stringify({listingId:listing._id,message,consentToShare:true})});
      setMessages(prev=>({...prev,[listing._id]:""}));
      setNotice("Inquiry sent. The provider can now review it in their Shivasha account.");
      await load();
    } catch(error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  const updateStatus=async(inquiry,status)=>{
    setBusy(true);
    try { await request("/api/business-platform/marketplace/inquiries/"+inquiry._id,{method:"PATCH",body:JSON.stringify({status})}); await load(); }
    catch(error){setNotice(error.message);}
    finally{setBusy(false);}
  };
  const filtered=listings.filter(item=>
    (!department||item.department===department) &&
    (!query||[item.title,item.description,item.category,item.department,item.country].join(" ").toLowerCase().includes(query.toLowerCase()))
  );
  const tabs=[["discover","🌐 Discover"],["publish","＋ Publish service"],["my-listings","▤ My listings"],["inquiries","✉ Inquiries"]];
  const statusOptions=["New","Contacted","Qualified","Closed"];
  return <section style={{padding:"clamp(12px,2vw,22px)",color:"#172033"}}>
    <div style={{background:"linear-gradient(125deg,#171044,#4338ca 60%,#0f766e)",borderRadius:20,padding:"24px clamp(18px,3vw,32px)",color:"#fff",marginBottom:18}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2,opacity:.8}}>SHIVASHA • GLOBAL MARKETPLACE • PHASE 1</div>
      <h2 style={{fontSize:"clamp(24px,4vw,34px)",margin:"9px 0"}}>Find services. Share expertise. Grow globally.</h2>
      <p style={{margin:0,maxWidth:760,lineHeight:1.6,opacity:.92}}>Discover providers or publish your own service. Basic listings are free during the MVP. Use accurate details and respond only to genuine inquiries.</p>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {tabs.map(([key,label])=><button key={key} type="button" onClick={()=>setTab(key)} style={{...styles.button,background:tab===key?"#4338ca":"#eef2ff",color:tab===key?"#fff":"#3730a3"}}>{label}</button>)}
      <button type="button" onClick={load} disabled={busy} style={{...styles.button,background:"#0f766e"}}>↻ Refresh</button>
    </div>
    {notice&&<div role="status" style={{padding:11,borderRadius:10,background:"#eff6ff",color:"#1e40af",marginBottom:14}}>{notice}</div>}
    {tab==="discover"&&<>
      <div style={{...styles.card,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:14}}>
        <Field label="Search services" value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. AI chatbot, website, SEO"/>
        <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#475569"}}>Department<select style={styles.input} value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{DEPARTMENTS.map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12}}>
        {filtered.map(item=><article key={item._id} style={styles.card}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><span style={{fontSize:11,fontWeight:800,color:"#4338ca",background:"#eef2ff",padding:"5px 8px",borderRadius:20}}>{item.department}</span><span style={{fontSize:11,color:"#64748b"}}>{item.country||"Remote"}</span></div>
          <h3 style={{margin:"12px 0 6px"}}>{item.title}</h3><p style={{margin:"0 0 10px",color:"#64748b",lineHeight:1.55,fontSize:14}}>{item.description}</p>
          {item.category&&<div style={{fontSize:12,color:"#475569"}}>Speciality: {item.category}</div>}
          <div style={{fontSize:12,color:"#475569",marginTop:8}}>Provider: {item.ownerName||"Shivasha provider"}</div>
          {item.priceFrom>0&&<div style={{fontWeight:800,marginTop:8}}>From {item.currency} {item.priceFrom}</div>}
          <label style={{display:"grid",gap:6,marginTop:14,fontSize:12,fontWeight:700,color:"#475569"}}>Your requirement<textarea value={messages[item._id]||""} onChange={e=>setMessages(prev=>({...prev,[item._id]:e.target.value}))} rows={3} maxLength={2000} placeholder="Describe what you need (min. 10 characters)..." style={{...styles.input,resize:"vertical"}}/></label>
          <p style={{fontSize:11,color:"#64748b",lineHeight:1.45}}>By sending, you consent to share this message and your Shivasha account identity with this provider.</p>
          <button type="button" disabled={busy} onClick={()=>sendInquiry(item)} style={{...styles.button,width:"100%",opacity:busy ? 0.6 : 1}}>Send inquiry</button>
        </article>)}
        {!filtered.length&&<div style={{...styles.card,gridColumn:"1/-1",textAlign:"center",color:"#64748b"}}>{busy?"Loading listings…":"No matching published services yet. Be the first to publish a service."}</div>}
      </div>
    </>}
    {tab==="publish"&&<form onSubmit={createListing} style={{...styles.card,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
      <div style={{gridColumn:"1/-1"}}><h3 style={{margin:"0 0 4px"}}>Publish a service</h3><p style={{margin:0,color:"#64748b",fontSize:13}}>Create a truthful listing. Do not add private customer information or unsupported claims.</p></div>
      <Field label="Service title" required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Business website development"/>
      <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#475569"}}>Department<select style={styles.input} value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.map(x=><option key={x}>{x}</option>)}</select></label>
      <Field label="Speciality / category" maxLength={80} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. React, SEO, chatbot"/>
      <Field label="Country" maxLength={80} value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="India"/>
      <Field label="Starting price (optional)" type="number" min="0" max="100000000" value={form.priceFrom} onChange={e=>setForm({...form,priceFrom:e.target.value})} placeholder="0"/>
      <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#475569"}}>Currency<select style={styles.input} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{["USD","INR","EUR","GBP","AED","CAD","AUD"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label style={{gridColumn:"1/-1",display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#475569"}}>Description<textarea required maxLength={2000} rows={5} style={{...styles.input,resize:"vertical"}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explain the service, deliverables, experience and service area."/></label>
      <button disabled={busy} style={{...styles.button,gridColumn:"1/-1",opacity:busy ? 0.6 : 1}}>Publish free listing</button>
    </form>}
    {tab==="my-listings"&&<div style={{display:"grid",gap:10}}>{mine.map(item=><div key={item._id} style={styles.card}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><b>{item.title}</b><div style={{fontSize:12,color:"#64748b",marginTop:5}}>{item.department} · {item.country} · {item.status}</div></div><span style={{fontSize:11,color:item.status==="active"?"#15803d":"#b45309"}}>{item.status}</span></div><p style={{color:"#64748b",fontSize:14}}>{item.description}</p></div>)}{!mine.length&&<div style={styles.card}>You have not published a service yet.</div>}</div>}
    {tab==="inquiries"&&<div style={{display:"grid",gap:10}}>{inquiries.map(item=><div key={item._id} style={styles.card}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b>{item.listingTitle||"Service inquiry"}</b><span style={{fontSize:12,color:"#64748b"}}>{new Date(item.createdAt).toLocaleString()}</span></div><p style={{lineHeight:1.6}}>{item.message}</p><div style={{fontSize:12,color:"#64748b"}}>From account: {item.requesterName||"Shivasha member"} · {item.direction==="sent"?"Sent inquiry":"Received inquiry"}</div>{item.direction==="received"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>Status<select value={item.status} onChange={e=>updateStatus(item,e.target.value)} style={{...styles.input,width:"auto"}}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label>}</div>)}{!inquiries.length&&<div style={styles.card}>No inquiries yet.</div>}</div>}
    <p style={{fontSize:11,color:"#64748b",lineHeight:1.5,marginTop:16}}>MVP notice: account login is required. Provider verification, payments, external messaging, affiliate links and AI ranking are not activated yet. Do not treat a listing as independently verified.</p>
  </section>;
}
