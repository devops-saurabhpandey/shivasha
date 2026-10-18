import React, { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const inputStyle = { width: "100%", padding: "10px", border: "1px solid #d5dbe5", borderRadius: "8px", boxSizing: "border-box", marginTop: "5px" };
const buttonStyle = { padding: "10px 14px", border: 0, borderRadius: "8px", cursor: "pointer", fontWeight: 600 };

export default function CreatorFinanceAdmin({ auth }) {
  const [data, setData] = useState(null);
  const [creators, setCreators] = useState([]);
  const [percent, setPercent] = useState("10");
  const [entry, setEntry] = useState({ type: "revenue", amount: "", description: "", reference: "" });
  const [allocation, setAllocation] = useState({ creatorId: "", amount: "", description: "Creator income allocation" });
  const [payout, setPayout] = useState({ creatorId: "", amount: "", description: "Creator payout", reference: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth?.token, ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Finance request failed.");
    return result;
  }, [auth?.token]);

  const refresh = useCallback(async () => {
    const [summary, list] = await Promise.all([
      request("/api/creator-finance/admin/summary"),
      request("/api/creator-finance/admin/creators")
    ]);
    setData(summary);
    setCreators(list.creators || []);
    setPercent(String(summary.summary.creatorPoolPercent));
    setAllocation(old => ({ ...old, creatorId: old.creatorId || list.creators?.[0]?._id || "" }));
    setPayout(old => ({ ...old, creatorId: old.creatorId || list.creators?.[0]?._id || "" }));
  }, [request]);

  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);

  const run = async (work, success) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); await refresh(); setMessage(success); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const submitEntry = e => { e.preventDefault(); run(async () => {
    await request("/api/creator-finance/admin/entries", { method: "POST", body: JSON.stringify(entry) });
    setEntry({ type: "revenue", amount: "", description: "", reference: "" });
  }, "Financial entry saved."); };
  const savePercent = e => { e.preventDefault(); run(() => request("/api/creator-finance/admin/settings", { method: "PUT", body: JSON.stringify({ creatorPoolPercent: Number(percent) }) }), "Creator Pool percentage updated for future allocations."); };
  const submitAllocation = e => { e.preventDefault(); run(async () => {
    await request("/api/creator-finance/admin/allocations", { method: "POST", body: JSON.stringify(allocation) });
    setAllocation(old => ({ ...old, amount: "" }));
  }, "Creator earnings allocated."); };
  const submitPayout = e => { e.preventDefault(); run(async () => {
    await request("/api/creator-finance/admin/payouts", { method: "POST", body: JSON.stringify(payout) });
    setPayout(old => ({ ...old, amount: "", reference: "" }));
  }, "Payout recorded. This records a payment; it does not transfer money automatically."); };

  const field = (label, value, onChange, props = {}) => <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{label}<input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} {...props} /></label>;
  const select = (label, value, onChange, options) => <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{label}<select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;

  return <section className="content" style={{ display: "grid", gap: 16 }}>
    <div className="panel" style={{ padding: 18 }}>
      <h2 style={{ marginTop: 0 }}>Creator Income · Admin Control</h2>
      <p className="muted">Record real received revenue, costs and liabilities. Creator earnings are ledger entries; this panel does not automatically transfer money.</p>
      {error && <div className="api-error" role="alert">{error}</div>}
      {message && <div role="status" style={{ padding: 10, margin: "10px 0", background: "#e7f8ed", borderRadius: 8 }}>{message}</div>}
      {!data ? <p>Loading finance summary…</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
        {[["Received revenue",data.summary.revenue],["Expenses",data.summary.expenses],["Liabilities",data.summary.liabilities],["Net available",data.summary.netAvailable],["Creator Pool",data.summary.creatorPool],["Unallocated Pool",data.summary.unallocatedPool],["Allocated",data.summary.allocated],["Paid out",data.summary.paid],["Unpaid creator earnings",data.summary.unpaidCreatorEarnings]].map(([label,value]) => <div key={label} style={{ border: "1px solid #e1e5ec", borderRadius: 10, padding: 12 }}><small>{label}</small><h3 style={{ margin: "8px 0 0" }}>{money(value)}</h3></div>)}
      </div>}
    </div>

    <div className="panel" style={{ padding: 18 }}>
      <h3>Creator Pool Settings</h3>
      <form onSubmit={savePercent} style={{ maxWidth: 360 }}>
        {field("Creator Pool (% of net available)", percent, setPercent, { type: "number", min: 0, max: 100, step: "0.01", required: true })}
        <button style={buttonStyle} disabled={busy}>Save percentage</button>
      </form>
      <small>Formula: max(0, received revenue − recorded expenses − recorded liabilities) × percentage. Changing the percentage does not delete or rewrite earlier ledger entries.</small>
    </div>

    <div className="panel" style={{ padding: 18 }}>
      <h3>Record Company Finance Entry</h3>
      <form onSubmit={submitEntry} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {select("Entry type", entry.type, v => setEntry({ ...entry, type: v }), [{value:"revenue",label:"Revenue received"},{value:"expense",label:"Expense paid/incurred"},{value:"liability",label:"Other liability"}])}
        {field("Amount (INR)", entry.amount, v => setEntry({ ...entry, amount: v }), { type: "number", min: "0.01", step: "0.01", required: true })}
        {field("Description", entry.description, v => setEntry({ ...entry, description: v }), { maxLength: 300, required: true })}
        {field("Reference (optional)", entry.reference, v => setEntry({ ...entry, reference: v }), { maxLength: 120 })}
        <div style={{ alignSelf: "end", paddingBottom: 12 }}><button style={buttonStyle} disabled={busy}>Save entry</button></div>
      </form>
    </div>

    <div className="panel" style={{ padding: 18 }}>
      <h3>Allocate Creator Earnings</h3>
      <form onSubmit={submitAllocation} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {select("Creator account", allocation.creatorId, v => setAllocation({ ...allocation, creatorId: v }), creators.map(c => ({value:c._id,label:c.name + " · " + c.email})))}
        {field("Amount (INR)", allocation.amount, v => setAllocation({ ...allocation, amount: v }), { type: "number", min: "0.01", step: "0.01", required: true })}
        {field("Allocation note", allocation.description, v => setAllocation({ ...allocation, description: v }), { maxLength: 300, required: true })}
        <div style={{ alignSelf: "end", paddingBottom: 12 }}><button style={buttonStyle} disabled={busy || !creators.length}>Allocate earnings</button></div>
      </form>
    </div>

    <div className="panel" style={{ padding: 18 }}>
      <h3>Record Creator Payout</h3>
      <form onSubmit={submitPayout} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {select("Creator account", payout.creatorId, v => setPayout({ ...payout, creatorId: v }), creators.map(c => ({value:c._id,label:c.name + " · " + c.email})))}
        {field("Amount (INR)", payout.amount, v => setPayout({ ...payout, amount: v }), { type: "number", min: "0.01", step: "0.01", required: true })}
        {field("Payment note", payout.description, v => setPayout({ ...payout, description: v }), { maxLength: 300, required: true })}
        {field("Transaction reference", payout.reference, v => setPayout({ ...payout, reference: v }), { maxLength: 120 })}
        <div style={{ alignSelf: "end", paddingBottom: 12 }}><button style={buttonStyle} disabled={busy || !creators.length}>Record payout</button></div>
      </form>
    </div>

    <div className="panel" style={{ padding: 18, overflowX: "auto" }}>
      <h3>Recent Finance Ledger</h3>
      {!data?.recent?.length ? <p>No finance entries recorded yet.</p> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}><thead><tr>{["Date","Type","Creator","Description","Amount","Reference"].map(x=><th key={x} style={{ textAlign:"left", padding:8, borderBottom:"1px solid #ddd" }}>{x}</th>)}</tr></thead><tbody>{data.recent.map(item=><tr key={item._id}><td style={{padding:8}}>{new Date(item.createdAt).toLocaleDateString()}</td><td style={{padding:8}}>{item.type}</td><td style={{padding:8}}>{item.creator?.name || "—"}</td><td style={{padding:8}}>{item.description}</td><td style={{padding:8}}>{money(item.amount)}</td><td style={{padding:8}}>{item.reference || "—"}</td></tr>)}</tbody></table>}
      <p><small>Audit note: entries are append-only through this API. Reconcile against bank statements and invoices before paying creators.</small></p>
    </div>
  </section>;
}
