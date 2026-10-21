import React, { useCallback, useEffect, useState } from "react";

const BOARDS = ["CBSE", "ICSE", "ISC"];
const SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"];
const TYPES = ["Textbooks", "Workbooks", "Reference Books", "Exam Preparation", "Digital Learning"];
const COPYRIGHT = [
  ["unknown", "Unknown — review required"],
  ["official-free", "Official free resource"],
  ["authorized-listing", "Authorized listing"],
  ["permission-required", "Permission required"]
];
const EMPTY_FORM = {
  board: "CBSE", grade: "10", subject: "Mathematics", resourceType: "Textbooks",
  title: "", author: "", publisher: "", edition: "", language: "English",
  academicYear: "", isbn: "", sourceUrl: "", price: "", currency: "INR",
  copyrightStatus: "unknown"
};

export default function EducationResourceAdminPanel({ auth, apiBase }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!auth?.token || !apiBase) return;
    try {
      const response = await fetch(apiBase + "/api/education/resources?verified=" + filter, {
        headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load resource catalogue");
      setRows(data.resources || []);
    } catch (error) {
      setMessage(error.message || "Could not load resource catalogue");
    }
  }, [auth?.token, apiBase, filter]);

  useEffect(() => { load(); }, [load]);
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!/^https?:\\/\\//i.test(form.sourceUrl.trim())) {
      setMessage("Official source ke liye valid http/https URL enter karein.");
      return;
    }
    if (form.price !== "" && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
      setMessage("Price blank ya zero se zyada honi chahiye.");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, grade: Number(form.grade), price: form.price === "" ? null : Number(form.price) };
      const response = await fetch(apiBase + "/api/education/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Resource save nahi hua");
      setMessage("Resource save ho gaya. Students ko dikhne se pehle verification zaroori hai.");
      setForm(EMPTY_FORM);
      setFilter("false");
      await load();
    } catch (error) {
      setMessage(error.message || "Resource save nahi hua");
    } finally {
      setBusy(false);
    }
  }

  async function verifyResource(resource, verified) {
    const action = verified ? "verify" : "unverify";
    if (verified && !window.confirm("Is source, edition aur copyright status ko review karke verify kar rahe hain?")) return;
    try {
      const response = await fetch(apiBase + "/api/education/resources/" + resource._id + "/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify({ verified })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Resource " + action + " nahi hua");
      setMessage(verified ? "Resource verified." : "Resource verification hata di gayi.");
      await load();
    } catch (error) {
      setMessage(error.message || "Update failed");
    }
  }

  async function removeResource(resource) {
    if (!window.confirm('"' + resource.title + '" ko permanently delete karna hai?')) return;
    try {
      const response = await fetch(apiBase + "/api/education/resources/" + resource._id, {
        method: "DELETE", headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setMessage("Catalogue entry delete ho gayi.");
      await load();
    } catch (error) {
      setMessage(error.message || "Delete failed");
    }
  }

  return <section className="education-practice education-admin-panel" aria-labelledby="education-resource-admin-title">
    <div className="education-resource-heading">
      <span className="house-kicker">ADMIN WORKSPACE · SHIVASHA EDUTECH</span>
      <h3 id="education-resource-admin-title">Books & resource catalogue manager</h3>
      <p>Official source, board, class, publisher aur edition details add karein. Har nayi entry review hone tak students se hidden rahegi. Copyrighted books upload na karein.</p>
    </div>
    <form className="education-catalogue-filters education-admin-form" onSubmit={submit}>
      <label>Board<select value={form.board} onChange={e => change("board", e.target.value)}>{BOARDS.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Class<select value={form.grade} onChange={e => change("grade", e.target.value)}>{Array.from({length:12}, (_,i) => <option key={i+1} value={i+1}>Class {i+1}</option>)}</select></label>
      <label>Subject<select value={form.subject} onChange={e => change("subject", e.target.value)}>{SUBJECTS.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Resource type<select value={form.resourceType} onChange={e => change("resourceType", e.target.value)}>{TYPES.map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="education-admin-wide">Book / resource title<input required maxLength="180" value={form.title} onChange={e => change("title", e.target.value)} /></label>
      <label>Author<input maxLength="160" value={form.author} onChange={e => change("author", e.target.value)} /></label>
      <label>Publisher<input maxLength="160" value={form.publisher} onChange={e => change("publisher", e.target.value)} /></label>
      <label>Edition<input maxLength="80" value={form.edition} onChange={e => change("edition", e.target.value)} /></label>
      <label>Language<input maxLength="50" value={form.language} onChange={e => change("language", e.target.value)} /></label>
      <label>Academic year<input maxLength="20" placeholder="2026–27" value={form.academicYear} onChange={e => change("academicYear", e.target.value)} /></label>
      <label>ISBN (optional)<input maxLength="24" value={form.isbn} onChange={e => change("isbn", e.target.value)} /></label>
      <label>Price (optional)<input type="number" min="0" step="0.01" value={form.price} onChange={e => change("price", e.target.value)} /></label>
      <label>Currency<select value={form.currency} onChange={e => change("currency", e.target.value)}><option value="INR">INR ₹</option><option value="USD">USD $</option></select></label>
      <label>Copyright status<select value={form.copyrightStatus} onChange={e => change("copyrightStatus", e.target.value)}>{COPYRIGHT.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <label className="education-admin-wide">Official source URL<input required type="url" maxLength="1000" placeholder="https://..." value={form.sourceUrl} onChange={e => change("sourceUrl", e.target.value)} /></label>
      <div className="education-admin-wide"><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save as pending review"}</button></div>
    </form>
    {message && <p role="status" className="education-answer-feedback">{message}</p>}
    <div className="education-live-catalogue">
      <div className="education-live-catalogue-heading">
        <h4>Manage resource entries</h4>
        <select aria-label="Filter catalogue resources" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All resources</option><option value="false">Pending review</option><option value="true">Verified only</option>
        </select>
      </div>
      {!rows.length && <p className="education-catalogue-empty">Is filter ke liye abhi koi resource entry nahi hai.</p>}
      {rows.map(resource => <article className="education-catalogue-entry" key={resource._id}>
        <div>
          <span className={resource.verified ? "education-verified-tag" : "education-unverified-tag"}>{resource.verified ? "✓ Verified" : "Pending review"}</span>
          <h5>{resource.title}</h5>
          <p>{[resource.author, resource.publisher, resource.edition, resource.language].filter(Boolean).join(" · ") || "Book details not supplied"}</p>
          <small>{resource.board} · Class {resource.grade} · {resource.subject} · {resource.resourceType}{resource.price != null ? " · " + resource.currency + " " + resource.price : ""}</small>
          <p><small>Copyright status: {resource.copyrightStatus || "unknown"}</small></p>
        </div>
        <div className="education-admin-actions">
          {!resource.verified ? <button type="button" className="primary" onClick={() => verifyResource(resource, true)}>Verify</button> : <button type="button" onClick={() => verifyResource(resource, false)}>Unverify</button>}
          <a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a>
          <button type="button" onClick={() => removeResource(resource)}>Delete</button>
        </div>
      </article>)}
    </div>
  </section>;
}
