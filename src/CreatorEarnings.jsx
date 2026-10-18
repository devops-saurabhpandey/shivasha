import React, { useEffect, useState } from "react";
const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
export default function CreatorEarnings({ auth }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(API_BASE + "/api/creator-finance/me", { headers: { Authorization: "Bearer " + auth?.token } })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || "Unable to load earnings."); return d; })
      .then(d => { if (alive) setData(d); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [auth?.token]);
  return <section className="content"><div className="panel" style={{padding:20}}>
    <h2>My Creator Earnings</h2><p className="muted">Only earnings allocated by Shivasha Admin appear here. Uploading content by itself does not guarantee payment.</p>
    {error && <div className="api-error">{error}</div>}
    {!data && !error ? <p>Loading earnings…</p> : data && <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
        {[["Total allocated",data.earned],["Paid",data.paid],["Pending",data.pending]].map(([label,value])=><div key={label} style={{border:"1px solid #e1e5ec",borderRadius:10,padding:14}}><small>{label}</small><h3>{money(value)}</h3></div>)}
      </div>
      <h3>Transaction History</h3>
      {!data.entries?.length ? <p>No creator earnings have been allocated to your account yet.</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Date","Type","Details","Amount"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{data.entries.map(e=><tr key={e._id}><td style={{padding:8}}>{new Date(e.createdAt).toLocaleDateString()}</td><td style={{padding:8}}>{e.type}</td><td style={{padding:8}}>{e.description}</td><td style={{padding:8}}>{money(e.amount)}</td></tr>)}</tbody></table></div>}
    </>}
  </div></section>;
}
