import React, { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));

export default function AffiliateCenter({ auth }) {
  const [data, setData] = useState(null);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState([]);
  const [campaignCourseId, setCampaignCourseId] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState("Hindi");
  const [campaigns, setCampaigns] = useState([]);
  const [campaignBusy, setCampaignBusy] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Affiliate request failed.");
    return body;
  }, [auth?.token]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await request("/api/affiliates/me")); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!data?.joined) return;
    request("/api/learning/courses").then(result => setCourses(result.courses || [])).catch(e => setError(e.message));
  }, [data?.joined, request]);

  const join = async () => {
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/affiliates/join", { method: "POST", body: JSON.stringify({ acceptPolicy }) }); setMessage("Affiliate partner profile created."); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(data?.referralUrl || ""); setMessage("Referral link copied."); }
    catch { setError("Clipboard access unavailable. Please copy the referral link manually."); }
  };

  const generateCampaigns = async () => {
    setCampaignBusy(true); setError(""); setMessage("");
    try { const result = await request("/api/affiliates/campaign-kit", { method: "POST", body: JSON.stringify({ courseId: campaignCourseId, language: campaignLanguage, channels: ["whatsapp", "facebook", "youtube"] }) }); setCampaigns(result.campaigns || []); setMessage("Campaign drafts generated. Review each draft before sharing."); }
    catch (e) { setError(e.message); }
    finally { setCampaignBusy(false); }
  };

  const copyCampaign = async content => {
    try { await navigator.clipboard.writeText(content); setMessage("Campaign draft copied. Review it before posting."); }
    catch { setError("Clipboard access unavailable. Please select and copy the draft manually."); }
  };

  if (loading) return <section className="content"><div className="panel">Loading Affiliate Partner Centre…</div></section>;

  return <section className="content">
    <div className="feed-head"><div><h2>Affiliate Partner Centre</h2><p>Share genuine SHIVASHA learning and services. Earn only on eligible, verified sales under the published policy.</p></div></div>
    {error && <div className="api-error" role="alert">{error}</div>}
    {message && <div className="panel" role="status" style={{ borderColor: "#b8dec5" }}>{message}</div>}
    {!data?.joined ? <div className="panel" style={{ maxWidth: 820, padding: 22 }}>
      <div style={{ fontSize: 38 }}>🤝</div><h3>Become a SHIVASHA Affiliate Partner</h3>
      <p>Partner enrollment is free and optional. No joining fee, paid rank, downline purchase or recruitment reward. A click or enquiry is not a sale. Commission is considered only after an administrator verifies a real, settled transaction.</p>
      <ul><li>No commission on self-purchases.</li><li>Cancelled, refunded, duplicate or chargeback transactions are ineligible or reversed.</li><li>Rates, eligible offers and payout rules must be published before promotion.</li><li>No guaranteed income, leads, jobs or business results.</li><li>Use approved content only and disclose affiliate relationships clearly.</li></ul>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "18px 0" }}><input type="checkbox" checked={acceptPolicy} onChange={e => setAcceptPolicy(e.target.checked)} /><span>I have read and accept the SHIVASHA Affiliate Partner Policy (version {data?.policyVersion}).</span></label>
      <button className="primary" disabled={!acceptPolicy || busy} onClick={join}>{busy ? "Please wait…" : "Join free as affiliate partner"}</button>
    </div> : <div style={{ display: "grid", gap: 16 }}>
      <div className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><div><small className="muted">Your referral code</small><h2 style={{ margin: "6px 0" }}>{data.partner.code}</h2></div><span className="badge">{data.partner.status}</span></div>
        <p className="muted">Share this link only with people who may genuinely be interested. Do not spam or make income guarantees.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input readOnly value={data.referralUrl} style={{ flex: "1 1 260px" }} /><button className="primary" onClick={copyLink}>Copy referral link</button></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button className="secondary" onClick={refresh}>Refresh dashboard</button></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
        {[
          ["Tracked clicks", data.metrics.clicks],
          ["Opt-in enquiries", data.metrics.enquiries],
          ["Pending review", money(data.metrics.pendingReview)],
          ["Approved commission", money(data.metrics.approvedCommission)],
          ["Reversed", money(data.metrics.reversed)]
        ].map(([label, value]) => <div className="panel" key={label} style={{ padding: 16 }}><small className="muted">{label}</small><h3 style={{ margin: "8px 0 0" }}>{value}</h3></div>)}
      </div>
      <div className="panel" style={{ padding: 20 }}>
        <h3>Affiliate Campaign Content Assistant</h3>
        <p className="muted">Create ready-to-review WhatsApp, Facebook and YouTube drafts for a published SHIVASHA course. Each draft includes your referral link and affiliate disclosure. Nothing is published automatically.</p>
        {courses.length ? <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <label>Published course<select value={campaignCourseId} onChange={e => setCampaignCourseId(e.target.value)}><option value="">Select a course</option>{courses.map(course => <option key={course._id} value={course._id}>{course.title}</option>)}</select></label>
            <label>Content language<select value={campaignLanguage} onChange={e => setCampaignLanguage(e.target.value)}><option value="Hindi">Hindi</option><option value="English">English</option></select></label>
          </div>
          <button className="primary" style={{ marginTop: 12 }} disabled={!campaignCourseId || campaignBusy || data.partner.status !== "active"} onClick={generateCampaigns}>{campaignBusy ? "Creating drafts…" : "Generate campaign drafts"}</button>
          {campaigns.length > 0 && <div style={{ display: "grid", gap: 12, marginTop: 16 }}>{campaigns.map(item => <article className="panel" key={item.channel} style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h4 style={{ textTransform: "capitalize", margin: 0 }}>{item.channel} draft</h4><button className="secondary" onClick={() => copyCampaign(item.content)}>Copy draft</button></div><textarea readOnly rows={7} value={item.content} style={{ width: "100%", marginTop: 10 }} /><small className="muted">Affiliate disclosure included · Manual review required</small></article>)}</div>}
        </> : <p className="muted">No published courses are available yet. Once a course is published, it will appear here.</p>}
      </div>
      <div className="panel" style={{ padding: 20 }}><h3>Commission history</h3><p className="muted">Approved commission is not the same as a payout. Payouts are not enabled in this phase.</p>
        {data.commissions?.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Transaction</th><th align="left">Offer</th><th align="right">Sale</th><th align="right">Commission</th><th align="left">Status</th></tr></thead><tbody>{data.commissions.map(item => <tr key={item._id}><td>{item.transactionReference}</td><td>{item.productDescription}</td><td align="right">{money(item.grossAmount)}</td><td align="right">{money(item.commissionAmount)}</td><td>{item.status.replace("_", " ")}</td></tr>)}</tbody></table></div> : <p className="muted">No verified transactions yet.</p>}
      </div>
    </div>}
  </section>;
}
