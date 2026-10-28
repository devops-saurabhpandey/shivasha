import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const field = {display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:"1px solid #cbd5e1",borderRadius:10,background:"#fff",color:"#0f172a"};

export default function SalesAgent({auth}) {
  const [form,setForm]=useState({product:"",customerType:"Small business",customerNeed:"",price:"",language:"Hinglish",channel:"WhatsApp",customerName:"",customerContact:"",businessName:""});
  const [result,setResult]=useState(null);
  const [resultMode,setResultMode]=useState("");
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const change=(key,value)=>setForm(prev=>({...prev,[key]:value}));
  const generate=async e=>{
    e.preventDefault();setLoading(true);setMessage("");setResult(null);
    try{
      const response=await fetch(API_BASE+"/api/sales-agent/generate",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth?.token},body:JSON.stringify(form)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||"Sales agent is not available.");
      setResult(data.result);
      setResultMode(data.mode || "ai");
      setMessage(data.disclaimer || "Review the suggestions before use.");
    }catch(error){setMessage(error.message||"Could not generate a sales plan.");}
    finally{setLoading(false);}
  };
  const saveLead=async()=>{
    if(!form.customerName.trim()){setMessage("CRM में lead save करने के लिए customer name भरें.");return;}
    setSaving(true);setMessage("");
    try{
      const notes=["Product/service: "+form.product,"Customer need: "+form.customerNeed,"Suggested next step: "+(result?.nextStep||""),"Sales channel: "+form.channel].filter(Boolean).join("\n");
      const response=await fetch(API_BASE+"/api/business/leads",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth?.token},body:JSON.stringify({name:form.customerName.trim(),contact:form.customerContact.trim(),business:form.businessName.trim(),stage:"New",notes})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||"Lead save nahi hui.");
      setMessage("Lead CRM में save हो गई।");
    }catch(error){setMessage(error.message||"CRM unavailable.");}
    finally{setSaving(false);}
  };
  const copy=async text=>{try{await navigator.clipboard.writeText(text);setMessage("Message copied. Customer ko bhejne se pehle review karein.");}catch{setMessage("Text select karke copy karein.");}};
  return <section className="content">
    <div className="panel" style={{padding:22,borderRadius:18}}>
      <div style={{fontSize:12,fontWeight:900,letterSpacing:".08em",color:"#16845b"}}>SHIVASHA BUSINESS SUITE</div>
      <h2 style={{margin:"8px 0"}}>🤝 AI Sales Agent</h2>
      <p style={{color:"#64748b",lineHeight:1.6}}>Product pitch, customer discovery questions, objection handling aur follow-up message banayein. Customer ko message bhejne se pehle aap review aur approve karenge.</p>
      <form onSubmit={generate}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>
          <label>Product / service *<input required maxLength={180} value={form.product} onChange={e=>change("product",e.target.value)} style={field} placeholder="e.g. SHIVASHA CRM software"/></label>
          <label>Customer type<select value={form.customerType} onChange={e=>change("customerType",e.target.value)} style={field}>{["Small business","Retail shop","Startup","Enterprise / MNC","Student / individual","Existing customer","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Price / offer (optional)<input maxLength={120} value={form.price} onChange={e=>change("price",e.target.value)} style={field} placeholder="Actual price or leave blank"/></label>
          <label>Communication channel<select value={form.channel} onChange={e=>change("channel",e.target.value)} style={field}>{["WhatsApp","Phone call","Email","In-person","SHIVASHA message"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Output language<select value={form.language} onChange={e=>change("language",e.target.value)} style={field}>{["Hinglish","Hindi","English"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Customer need / problem *<textarea required maxLength={1500} value={form.customerNeed} onChange={e=>change("customerNeed",e.target.value)} style={{...field,minHeight:78}} placeholder="Customer ko kis problem ka solution chahiye?"/></label>
        </div>
        <button className="primary" type="submit" disabled={loading} style={{marginTop:14}}>{loading?"Sales plan ban raha hai…":"Generate sales plan"}</button>
      </form>
      {message&&<p role="status" style={{color:"#16845b",fontWeight:700}}>{message}</p>}
    </div>
    {result&&<div className="panel" style={{padding:22,borderRadius:18,marginTop:16}}>
      <p role="status" style={{padding:12,borderRadius:10,background:resultMode==="basic_template"?"#fff7ed":"#ecfdf5",color:resultMode==="basic_template"?"#9a3412":"#166534"}}>{resultMode==="basic_template"?"🆓 Basic template mode — no external AI API is used, so no AI API charge. Personalize the draft yourself.":"✨ AI-generated mode — review all claims before sending."}</p>
      <h3>🎯 Sales approach</h3><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{result.approach}</p>
      <h3>❓ Customer discovery questions</h3><ol style={{lineHeight:1.8}}>{(result.questions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol>
      <h3>💬 Ready-to-review message</h3><div style={{whiteSpace:"pre-wrap",padding:14,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,lineHeight:1.7}}>{result.message}</div><button className="secondary" style={{marginTop:8}} onClick={()=>copy(result.message)}>Copy message</button>
      <h3>🛡️ Handle objections honestly</h3>{(result.objections||[]).map((x,i)=><div key={i} style={{padding:"10px 0",borderBottom:"1px solid #e2e8f0"}}><b>{x.objection}</b><p style={{margin:"5px 0",lineHeight:1.6}}>{x.response}</p></div>)}
      <h3>➡️ Suggested next step</h3><p>{result.nextStep}</p>
      <hr/><h3>Save prospect to CRM</h3><p style={{color:"#64748b"}}>Only save customer details you have permission to record. No message is sent automatically.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <label>Customer name *<input value={form.customerName} onChange={e=>change("customerName",e.target.value)} maxLength={120} style={field}/></label>
        <label>Contact (optional)<input value={form.customerContact} onChange={e=>change("customerContact",e.target.value)} maxLength={160} style={field} placeholder="Phone or email"/></label>
        <label>Business name (optional)<input value={form.businessName} onChange={e=>change("businessName",e.target.value)} maxLength={200} style={field}/></label>
      </div>
      <button className="primary" onClick={saveLead} disabled={saving} style={{marginTop:12}}>{saving?"Saving…":"Save lead to CRM"}</button>
    </div>}
    <div className="panel" style={{padding:18,borderRadius:18,marginTop:16,color:"#64748b",fontSize:13,lineHeight:1.6}}>AI suggestions can be wrong. Verify prices, product features, guarantees and customer claims before using them. This tool does not send messages automatically, scrape contacts, or promise sales.</div>
  </section>;
}
