import React, { useState } from "react";
import "./CityWiseJobSearch.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const CITIES = ["Kanpur","Lucknow","Unnao","Noida","Delhi","Gurugram","Bengaluru","Pune","Mumbai","Hyderabad","All India"];
const SOURCES = [
  {name:"LinkedIn",url:q=>`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}`},
  {name:"Indeed",url:(q,c)=>`https://in.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(c==="All India"?"India":c)}`},
  {name:"Google Jobs",url:(q,c)=>`https://www.google.com/search?q=${encodeURIComponent(q+" jobs "+(c==="All India"?"India":c))}`}
];

export default function CityWiseJobSearch({auth}) {
  const [query,setQuery]=useState(""),[city,setCity]=useState("Kanpur"),[experience,setExperience]=useState("Any"),[workMode,setWorkMode]=useState("Any");
  const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[searched,setSearched]=useState(false);
  const search=async e=>{
    e?.preventDefault();setLoading(true);setError("");setSearched(true);
    try {
      const params=new URLSearchParams({query,city,experience,workMode,page:"1",pageSize:"20"});
      const response=await fetch(`${API_BASE}/api/jobs?${params}`,{headers:auth?.token?{Authorization:"Bearer "+auth.token}:{}});
      if(!response.ok) {
        if(response.status===404) throw new Error("SHIVASHA job database API abhi connect nahi hai. Neeche external job boards par search kar sakte hain.");
        throw new Error("Job search abhi available nahi hai. Thodi der baad try karein.");
      }
      const data=await response.json();setJobs(Array.isArray(data)?data:(data.jobs||[]));
    } catch(err) {setJobs([]);setError(err.message||"Connection error");}
    finally {setLoading(false);}
  };
  const externalQuery=query.trim()||"jobs";
  return <section className="content city-jobs">
    <div className="job-hero"><div><span className="job-eyebrow">SHIVASHA CAREERS</span><h2>Find your next opportunity</h2><p>Apne city, skills aur experience ke hisaab se jobs khojein.</p></div><div className="job-hero-icon">💼</div></div>
    <form className="job-search-panel" onSubmit={search}>
      <label>Job title / skills<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Python Developer, Data Analyst…" /></label>
      <label>City<select value={city} onChange={e=>setCity(e.target.value)}>{CITIES.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Experience<select value={experience} onChange={e=>setExperience(e.target.value)}>{["Any","Fresher","0-1 years","1-3 years","3+ years"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Work mode<select value={workMode} onChange={e=>setWorkMode(e.target.value)}>{["Any","On-site","Remote","Hybrid"].map(x=><option key={x}>{x}</option>)}</select></label>
      <button className="primary job-search-button" disabled={loading}>{loading?"Searching…":"🔎 Search SHIVASHA Jobs"}</button>
    </form>
    <div className="job-note">AI matching and verified company listings will appear here as the SHIVASHA jobs API is enabled. Search results from external sites open on their own platforms.</div>
    {error&&<div className="job-status" role="status">{error}</div>}
    {jobs.length>0&&<div className="job-results"><h3>SHIVASHA listings · {jobs.length}</h3>{jobs.map(job=><article className="job-card" key={job._id||job.id}><div><h3>{job.title}</h3><p>{job.companyName||job.company} · 📍 {job.city||"India"}</p><small>{job.workMode||"Work mode not specified"} · {job.experience||"Experience not specified"}</small></div>{job.applyUrl&&<a className="primary" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Apply ↗</a>}</article>)}</div>}
    <div className="job-results"><h3>🌐 Search external job boards</h3><p className="muted">These links run a search on external job sites; listings are not verified by SHIVASHA.</p><div className="job-source-grid">{SOURCES.map(s=><a key={s.name} className="job-source" href={s.url(externalQuery,city)} target="_blank" rel="noopener noreferrer"><b>{s.name}</b><span>Search {externalQuery} · {city}</span><strong>Open ↗</strong></a>)}</div></div>
    {searched&&!loading&&!error&&jobs.length===0&&<div className="job-status">Abhi SHIVASHA database mein matching listings nahi mili. External job boards try karein.</div>}
  </section>;
}
