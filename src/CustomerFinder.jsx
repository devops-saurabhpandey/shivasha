import React, { useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");

const sources = [
  { name: "Google Maps", description: "Find public business listings in your target location.", url: (q, l) => "https://www.google.com/maps/search/" + encodeURIComponent([q, l].filter(Boolean).join(" ")) },
  { name: "Google Search", description: "Search public business websites and contact pages.", url: (q, l) => "https://www.google.com/search?q=" + encodeURIComponent([q, l, "business"].filter(Boolean).join(" ")) },
  { name: "YouTube", description: "Find public channels and videos related to your niche.", url: (q, l) => "https://www.youtube.com/results?search_query=" + encodeURIComponent([q, l].filter(Boolean).join(" ")) },
  { name: "LinkedIn", description: "Search public professional and company pages.", url: (q, l) => "https://www.linkedin.com/search/results/companies/?keywords=" + encodeURIComponent([q, l].filter(Boolean).join(" ")) },
  { name: "Meta Ads Manager", description: "Use your own authorized ad account to build audiences and lead campaigns.", url: () => "https://www.facebook.com/adsmanager/" }
];

export default function CustomerFinder({ auth }) {
  const [service, setService] = useState("");
  const [location, setLocation] = useState("Kanpur");
  const [customerType, setCustomerType] = useState("Businesses");
  const [keywords, setKeywords] = useState("");
  const [form, setForm] = useState({ name: "", contact: "", business: "", notes: "" });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useMemo(() => [service, customerType, keywords].filter(Boolean).join(" "), [service, customerType, keywords]);
  const headers = { "Content-Type": "application/json", ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}) };

  const saveLead = async e => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/business/leads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          contact: form.contact.trim(),
          business: form.business.trim() || [service, location].filter(Boolean).join(" · "),
          stage: "New",
          notes: [form.notes.trim(), "Source: Shivasha AI Customer Finder; search: " + [query, location].filter(Boolean).join(" · ")].filter(Boolean).join("\\n")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save this lead. Please check the CRM connection.");
      setForm({ name: "", contact: "", business: "", notes: "" });
      setNotice("Lead saved to your Shivasha CRM.");
    } catch (error) {
      setNotice(error.message || "Unable to save lead.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="content">
    <div className="feed-head"><div><span className="eyebrow">SHIVASHA MARKETING</span><h2>🤖 AI Customer Finder</h2><p>Find relevant public business prospects, review the source yourself, and save qualified leads to your CRM.</p></div><span className="subscription-mode">FREE STARTER</span></div>
    <div className="module-notice">This starter uses public search pages and your authorized account. It does not scrape private profiles, import private contact data, or claim that a person is a verified lead. Search links open the source platform; you decide which prospects are relevant.</div>
    <div className="module-grid">
      <div className="panel">
        <div className="panel-head"><h3>Define your ideal customer</h3><span className="house-kicker">SEARCH SETUP</span></div>
        <label>Product or service<input value={service} onChange={e=>setService(e.target.value)} placeholder="e.g. website development, computer course"/></label>
        <label>Target location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="City, state or country"/></label>
        <label>Customer type<select value={customerType} onChange={e=>setCustomerType(e.target.value)}><option>Businesses</option><option>Schools and colleges</option><option>Retail shops</option><option>Manufacturers</option><option>Creators and channels</option><option>General customers</option></select></label>
        <label>Extra keywords<input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="e.g. small business, admissions, supplier"/></label>
        <div className="module-notice"><b>Search brief:</b> {[query, location].filter(Boolean).join(" · ") || "Enter a product or service and location"}<br/>Use the links to review public results. Only save a lead when its source and contact route are appropriate.</div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Search public sources</h3><span className="muted">Opens external search</span></div>
        {sources.map(source => <article className="module-row" key={source.name}><div><b>{source.name}</b><p>{source.description}</p></div><a className="primary" href={source.url(query || service || "business", location)} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",whiteSpace:"nowrap"}}>Search ↗</a></article>)}
        <p className="muted">Google, YouTube and LinkedIn results are controlled by those services. Meta audience targeting and lead imports require your own account and any required permissions.</p>
      </div>
    </div>
    <div className="panel">
      <div className="panel-head"><h3>Save a qualified prospect to CRM</h3><span className="house-kicker">YOUR ACCOUNT</span></div>
      <form onSubmit={saveLead} className="module-grid">
        <label>Prospect / business name *<input required maxLength="120" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name shown by the public source"/></label>
        <label>Public business contact route<input maxLength="254" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Public business email, phone or contact page URL"/></label>
        <label>Business / requirement<input maxLength="160" value={form.business} onChange={e=>setForm({...form,business:e.target.value})} placeholder="Business name or relevant need"/></label>
        <label>Source notes<textarea maxLength="1000" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Source URL, why it matches, permission/consent notes"/></label>
        <div><button className="primary" disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save lead to Shivasha CRM"}</button>{notice&&<p role="status" className="save-message">{notice}</p>}</div>
      </form>
    </div>
    <div className="panel"><h3>Next integration stage</h3><p>Connectors for Meta Lead Ads, Google APIs or other providers must be configured separately with explicit account authorization, server-side credentials, and any required app review. No external account is connected by this starter screen.</p></div>
  </section>;
}
