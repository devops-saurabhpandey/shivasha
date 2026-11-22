import React, { useEffect, useState } from "react";
import AdminReportActions from "./AdminReportActions.jsx";
import CreatorFinanceAdmin from "./CreatorFinanceAdmin.jsx";
import ProjectTracker from "./ProjectTracker.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");

function StatCard({ label, value }) {
  return <div className="panel" style={{ padding: "16px", minWidth: 130 }}>
    <small>{label}</small><h3 style={{ margin: "8px 0 0" }}>{value ?? "—"}</h3>
  </div>;
}

export default function AdminDashboard({ auth }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [softwareEnquiries, setSoftwareEnquiries] = useState([]);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryLoading, setEnquiryLoading] = useState(true);
  const [riskReviews, setRiskReviews] = useState([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState("");
  const [affiliateCommissions, setAffiliateCommissions] = useState([]);
  const [affiliateCommissionError, setAffiliateCommissionError] = useState("");
  const [affiliateAudit, setAffiliateAudit] = useState({});
  const [affiliateBusyId, setAffiliateBusyId] = useState("");


  useEffect(() => {
    let cancelled = false;
    const headers = { Authorization: "Bearer " + auth?.token };
    fetch(API_BASE + "/api/admin/stats", { headers })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load admin MIS");
        if (!cancelled) setStats(data);
      }).catch(err => { if (!cancelled) setStatsError(err.message); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    fetch(API_BASE + "/api/admin/software-enquiries", { headers })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load software enquiries");
        if (!cancelled) setSoftwareEnquiries(data.enquiries || []);
      }).catch(err => { if (!cancelled) setEnquiryError(err.message); })
      .finally(() => { if (!cancelled) setEnquiryLoading(false); });

    fetch(API_BASE + "/api/affiliates/admin/commissions", { headers })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load affiliate commissions");
        if (!cancelled) setAffiliateCommissions(data.commissions || []);
      }).catch(err => { if (!cancelled) setAffiliateCommissionError(err.message); });

    fetch(API_BASE + "/api/affiliates/risk-review", { headers })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load affiliate risk review");
        if (!cancelled) setRiskReviews(data.reviews || []);
      }).catch(err => { if (!cancelled) setRiskError(err.message); })
      .finally(() => { if (!cancelled) setRiskLoading(false); });

    fetch(API_BASE + "/api/users/admin/reports", { headers })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load reports");
        if (!cancelled) setReports(data.reports || []);
      }).catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth?.token]);

  const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

  const reviewAffiliateCommission = async (commission, status) => {
    const reviewNote = window.prompt(status === "approved" ? "Approval note (optional):" : "Reason for reversal (required):", "");
    if (reviewNote === null) return;
    if (status === "reversed" && !reviewNote.trim()) { setAffiliateCommissionError("A reason is required to reverse a commission."); return; }
    setAffiliateBusyId(commission._id); setAffiliateCommissionError("");
    try {
      const response = await fetch(API_BASE + "/api/affiliates/admin/commissions/" + commission._id + "/review", {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to review commission");
      setAffiliateCommissions(old => old.map(item => item._id === commission._id ? { ...item, ...data.commission } : item));
      await loadAffiliateAudit(commission._id);
    } catch (error) { setAffiliateCommissionError(error.message); }
    finally { setAffiliateBusyId(""); }
  };

  const loadAffiliateAudit = async id => {
    try {
      const response = await fetch(API_BASE + "/api/affiliates/admin/commissions/" + id + "/audit", { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load audit history");
      setAffiliateAudit(old => ({ ...old, [id]: data.events || [] }));
    } catch (error) { setAffiliateCommissionError(error.message); }
  };



  return <>
    <ProjectTracker auth={auth} />
    <section className="content">
      <div className="feed-head"><div><h2>SHIVASHA Admin MIS</h2><p>Platform overview and business-module totals.</p></div></div>
      {statsError && <div className="api-error">{statsError}</div>}
      {statsLoading ? <div className="panel empty">Loading admin MIS…</div> : stats && <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total users" value={stats.users} />
          <StatCard label="Posts" value={stats.posts} />
          <StatCard label="Open reports" value={stats.openReports} />
          <StatCard label="All reports" value={stats.allReports} />
        </div>
        <h3>CRM & Business MIS</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <StatCard label="CRM leads" value={stats.business?.crmLeads} />
          <StatCard label="Active products" value={stats.business?.activeProducts} />
          <StatCard label="Orders" value={stats.business?.orders} />
          <StatCard label="Recorded order value" value={money(stats.business?.recordedOrderValue)} />
          <StatCard label="Completed order value" value={money(stats.business?.completedOrderValue)} />
        </div>
        <p><small>{stats.business?.valueDisclaimer || "Order values are not verified payments or received revenue."}</small></p>
      </>}
    </section>
    <section className="content">
      <div className="feed-head"><div><h2>Admin Moderation</h2><p>Review user reports submitted to SHIVASHA.</p></div><b>{reports.filter(r => r.status === "open").length} open</b></div>
      {error && <div className="api-error">{error}</div>}
      {loading ? <div className="panel empty">Loading reports…</div> :
        reports.length ? <div className="panel">
          {reports.map(report => <article className="notification-item" key={report._id}>
            <div className="notification-copy">
              <b>{report.target?.name || "Unknown account"}</b>
              <small>Reported by {report.reporter?.name || "Unknown"} · {report.reason}</small>
              <small>Status: {report.status} · {new Date(report.createdAt).toLocaleString()}</small><AdminReportActions report={report} auth={auth} onUpdated={updated => setReports(old => old.map(item => item._id === updated._id ? updated : item))} />
            </div>
          </article>)}
        </div> : <div className="panel empty">No reports to review.</div>}
    </section>
    <section className="content">
      <div className="feed-head"><div><h2>Software Plan Enquiries</h2><p>Customer interest in individual SHIVASHA modules and Business Suite. These are enquiries, not paid orders.</p></div><b>{softwareEnquiries.filter(item => item.status === "Pending").length} pending</b></div>
      {enquiryError && <div className="api-error">{enquiryError}</div>}
      {enquiryLoading ? <div className="panel empty">Loading software enquiries…</div> :
        softwareEnquiries.length ? <div className="panel">
          {softwareEnquiries.map(item => <article className="notification-item" key={item._id}>
            <div className="notification-copy" style={{ width: "100%" }}>
              <b>{item.plan === "suite" ? "SHIVASHA Business Suite" : "Individual modules"}</b>
              <small>Customer: {item.customer?.name || "Unknown"} · {item.customer?.email || "No email"}</small>
              <small>Modules: {item.plan === "suite" ? "Business Suite request (module package not yet finalised)" : (item.modules || []).join(", ") || "None selected"}</small>
              {item.note && <p>{item.note}</p>}
              <small>Submitted: {new Date(item.createdAt).toLocaleString()} · Status: {item.status}</small>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8 }}>Update status
                <select value={item.status} onChange={async e => {
                  const status = e.target.value;
                  try {
                    const response = await fetch(API_BASE + "/api/admin/software-enquiries/" + item._id, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data.message || "Unable to update enquiry");
                    setSoftwareEnquiries(old => old.map(row => row._id === item._id ? data.enquiry : row));
                  } catch (error) { setEnquiryError(error.message); }
                }}>
                  <option>Pending</option><option>Contacted</option><option>Approved</option><option>Rejected</option>
                </select>
              </label>
            </div>
          </article>)}
        </div> : <div className="panel empty">No software plan enquiries yet.</div>}
    </section>
    <section className="content">
      <div className="feed-head"><div><h2>Affiliate Trust & Risk Review</h2><p>Advisory signals for pending commissions. Signals are not proof of fraud and do not automatically change commission status.</p></div><b>{riskReviews.filter(item => item.riskLevel === "review").length} flagged for review</b></div>
      {riskError && <div className="api-error" role="alert">{riskError}</div>}
      {riskLoading ? <div className="panel empty">Loading affiliate risk review…</div> :
        riskReviews.length ? <div className="panel">
          {riskReviews.map(item => {
            const commission = item.commission || {};
            const signals = item.riskSignals || [];
            return <article className="notification-item" key={commission._id}>
              <div className="notification-copy" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <b>{commission.productDescription || "Affiliate transaction"}</b>
                  <span className="badge">{signals.length ? "Manual review suggested" : "No current signal"}</span>
                </div>
                <small>Partner: {commission.partner?.user?.name || commission.partner?.code || "Unknown"} · Buyer: {commission.user?.name || "Unknown"}</small>
                <small>Reference: {commission.transactionReference || "—"} · Sale: {money(commission.grossAmount)} · Commission: {money(commission.commissionAmount)} ({commission.ratePercent ?? 0}%)</small>
                <small>Verified: {commission.verifiedAt ? new Date(commission.verifiedAt).toLocaleString() : "—"} · Status: {commission.status || "—"}</small>
                <small>Recent context: {item.context?.clicksLastHour ?? 0} clicks in 1 hour · {item.context?.buyerConversionsLastDay ?? 0} partner/buyer conversions in 24 hours</small>
                {signals.length > 0 ? <ul style={{ margin: "8px 0", paddingLeft: 20 }}>{signals.map(signal => <li key={signal.code}><b>{signal.code.replaceAll("_", " ")}</b>: {signal.message}</li>)}</ul> : <small>No configured risk threshold was triggered. Continue normal verification.</small>}
                <small>Review the original transaction evidence and partner explanation before taking action. This panel does not approve, reverse, freeze or withhold commission.</small>
              </div>
            </article>;
          })}
        </div> : <div className="panel empty">No pending affiliate commissions are currently queued for review.</div>}
    </section>
    <section className="content">
      <div className="feed-head"><div><h2>Affiliate Commission Control & Audit</h2><p>Admin-only approval and reversal controls. Every action records its actor, timestamp, status transition and note.</p></div><b>{affiliateCommissions.filter(item => item.status === "pending_review").length} pending</b></div>
      {affiliateCommissionError && <div className="api-error" role="alert">{affiliateCommissionError}</div>}
      {affiliateCommissions.length ? <div className="panel">
        {affiliateCommissions.map(item => <article className="notification-item" key={item._id}>
          <div className="notification-copy" style={{ width: "100%" }}>
            <b>{item.productDescription || "Affiliate transaction"}</b>
            <small>Partner: {item.partner?.user?.name || item.partner?.code || "Unknown"} · Buyer: {item.user?.name || "Unknown"}</small>
            <small>Ref: {item.transactionReference} · Sale: {money(item.grossAmount)} · Commission: {money(item.commissionAmount)} ({item.ratePercent}%)</small>
            <small>Status: {item.status?.replaceAll("_", " ")} · Verified: {item.verifiedAt ? new Date(item.verifiedAt).toLocaleString() : "—"}</small>
            {item.reviewNote && <small>Latest note: {item.reviewNote}</small>}
            {item.status === "pending_review" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="primary" disabled={affiliateBusyId === item._id} onClick={() => reviewAffiliateCommission(item, "approved")}>Approve</button>
              <button className="secondary" disabled={affiliateBusyId === item._id} onClick={() => reviewAffiliateCommission(item, "reversed")}>Reverse</button>
            </div>}
            <button className="secondary" style={{ marginTop: 8 }} onClick={() => loadAffiliateAudit(item._id)}>View audit history</button>
            {affiliateAudit[item._id] && <div className="panel" style={{ marginTop: 10, padding: 12 }}>
              <b>Audit history</b>
              {affiliateAudit[item._id].length ? affiliateAudit[item._id].map(event => <div key={event._id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border, #ddd)" }}>
                <small><b>{event.action?.replaceAll("_", " ")}</b> · {event.previousStatus || "new"} → {event.newStatus} · {event.actor?.name || "Admin"} · {new Date(event.createdAt).toLocaleString()}</small>
                {event.note && <small>{event.note}</small>}
              </div>) : <small>No audit entries were found.</small>}
            </div>}
          </div>
        </article>)}
      </div> : <div className="panel empty">No affiliate commission records available.</div>}
    </section>
    <CreatorFinanceAdmin auth={auth} />
  </>;
}
