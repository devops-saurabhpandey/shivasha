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
    <CreatorFinanceAdmin auth={auth} />
  </>;
}
