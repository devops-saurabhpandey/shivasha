import React, { useEffect, useState } from "react";
import AdminReportActions from "./AdminReportActions.jsx";
import CreatorFinanceAdmin from "./CreatorFinanceAdmin.jsx";

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

  return <>
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
    <CreatorFinanceAdmin auth={auth} />
  </>;
}
