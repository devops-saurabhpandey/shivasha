import React, { useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");

const COURSES = [
  { title: "B.Sc. Computer Science", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "On-campus", duration: "3 years", level: "Undergraduate", institution: "UGC", officialUrl: "https://www.ugc.gov.in/", note: "Verify institution recognition and current program details with the university." },
  { title: "BCA", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "Online / On-campus", duration: "3 years", level: "Undergraduate", institution: "UGC Distance Education Bureau", officialUrl: "https://deb.ugc.ac.in/Home/HEI_Prog_List", note: "Verify online/distance program recognition and current details." },
  { title: "B.Tech Computer Science", degree: "Bachelor", field: "Engineering", country: "India", mode: "On-campus", duration: "4 years", level: "Undergraduate", institution: "AICTE", officialUrl: "https://www.aicte-india.org/", note: "Verify institution approval and admission criteria." },
  { title: "M.Sc. Data Science", degree: "Master", field: "Data & AI", country: "United Kingdom", mode: "On-campus / Online", duration: "1–2 years", level: "Postgraduate", institution: "UCAS", officialUrl: "https://www.ucas.com/", note: "Search current courses; verify fees and requirements with the university." },
  { title: "M.S. Computer Science", degree: "Master", field: "Computer Science & IT", country: "United States", mode: "On-campus", duration: "1–2 years", level: "Postgraduate", institution: "EducationUSA", officialUrl: "https://educationusa.state.gov/", note: "Confirm course, accreditation and total cost with the university." },
  { title: "MBA", degree: "Master", field: "Business & Management", country: "Canada", mode: "On-campus / Online", duration: "1–2 years", level: "Postgraduate", institution: "Universities Canada", officialUrl: "https://univcan.ca/", note: "Verify current program and admission requirements with the institution." },
  { title: "B.Sc. Nursing", degree: "Bachelor", field: "Medical & Healthcare", country: "Australia", mode: "On-campus", duration: "3 years", level: "Undergraduate", institution: "Study Australia", officialUrl: "https://www.studyaustralia.gov.au/", note: "Verify course availability and professional registration requirements." },
  { title: "Bachelor of Laws (LLB)", degree: "Bachelor", field: "Law", country: "India", mode: "On-campus", duration: "3 years", level: "Undergraduate", institution: "Bar Council of India", officialUrl: "https://www.barcouncilofindia.org/", note: "Verify college recognition and legal education requirements." },
  { title: "PhD in Artificial Intelligence", degree: "PhD", field: "Data & AI", country: "Germany", mode: "Research", duration: "3–5 years", level: "Research", institution: "DAAD", officialUrl: "https://www.daad.de/en/", note: "Verify research position, supervisor and funding with the university." },
  { title: "Master of Public Health", degree: "Master", field: "Medical & Healthcare", country: "Singapore", mode: "On-campus", duration: "1–2 years", level: "Postgraduate", institution: "NUS Saw Swee Hock School of Public Health", officialUrl: "https://sph.nus.edu.sg/", note: "Check current program structure and admission criteria." },
  { title: "BA Psychology", degree: "Bachelor", field: "Arts & Humanities", country: "United States", mode: "On-campus / Online", duration: "3–4 years", level: "Undergraduate", institution: "EducationUSA", officialUrl: "https://educationusa.state.gov/", note: "Check university program details; licensing may require further study." },
  { title: "M.Ed.", degree: "Master", field: "Education", country: "India", mode: "On-campus / Online", duration: "2 years", level: "Postgraduate", institution: "NCTE", officialUrl: "https://ncte.gov.in/", note: "Verify institution recognition and program details." },
  { title: "BCA — Chhatrapati Shahu Ji Maharaj University, Kanpur", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "Open & Distance Learning", duration: "3 years (6 semesters)", level: "Undergraduate", institution: "CSJMU, Kanpur", officialUrl: "https://csjmu.ac.in/decode-courses/bca-2/", recognitionUrl: "https://deb.ugc.ac.in/Home/HEI_Prog_List", note: "University programme page: eligibility 10+2 with Mathematics; published tuition ₹20,000 per annum. UGC-DEB directory shows CSJMU BCA in 2025-26; verify recognition for the admission session you apply to.", eligibility: "Passed 10+2 with Mathematics from a recognised board", fee: "₹20,000 per annum (as published on the university programme page)", verified: true },
];

const countries = ["All countries", ...new Set(COURSES.map(c => c.country))];
const fields = ["All subjects", ...new Set(COURSES.map(c => c.field))];
const degrees = ["All degrees", "Bachelor", "Master", "PhD"];

export default function GlobalEducation({ auth }) {
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", contact: "", consent: false });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const submitEnquiry = async e => { e.preventDefault(); if (!auth?.token) { setNotice("Please sign in to save to CRM."); return; } setSaving(true); try { const r = await fetch(API_BASE + "/api/business/leads", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token }, body: JSON.stringify({ name: form.name.trim(), contact: form.contact.trim(), business: "Course enquiry: " + selected.title + " | " + selected.country, stage: "New", notes: "Consent given. Official source: " + selected.officialUrl }) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || "CRM save failed"); setNotice("Enquiry saved to SHIVASHA CRM."); setSelected(null); setForm({ name: "", contact: "", consent: false }); } catch(err) { setNotice(err.message); } finally { setSaving(false); } };
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All countries");
  const [field, setField] = useState("All subjects");
  const [degree, setDegree] = useState("All degrees");
  const [saved, setSaved] = useState([]);
  const filtered = useMemo(() => COURSES.filter(c =>
    (country === "All countries" || c.country === country) &&
    (field === "All subjects" || c.field === field) &&
    (degree === "All degrees" || c.degree === degree) &&
    (c.title + " " + c.field + " " + c.country + " " + c.institution).toLowerCase().includes(search.toLowerCase())
  ), [search, country, field, degree]);

  return <section className="global-education">
    <header className="education-hero">
      <span className="education-eyebrow">SHIVASHA • GLOBAL LEARNING</span>
      <h1>Global Degree Courses</h1>
      <p>Explore degree pathways across countries, subjects and study modes.</p>
      <label className="education-search">⌕ <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search degree, subject or country" /></label>
    </header>
    <div className="education-filters">
      <select aria-label="Country" value={country} onChange={e => setCountry(e.target.value)}>{countries.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Subject" value={field} onChange={e => setField(e.target.value)}>{fields.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Degree" value={degree} onChange={e => setDegree(e.target.value)}>{degrees.map(x => <option key={x}>{x}</option>)}</select>
    </div>
    <div className="education-results"><b>{filtered.length} course pathways</b><span>Official details are marked; other entries are course pathways</span></div>
    <div className="education-grid">
      {filtered.map((course, i) => <article className="education-card" key={course.title + course.country}>
        <div className="education-card-top"><span className="education-icon">🎓</span><button type="button" aria-label="Save course" className={saved.includes(course.title) ? "saved" : ""} onClick={() => setSaved(prev => prev.includes(course.title) ? prev.filter(x => x !== course.title) : [...prev, course.title])}>{saved.includes(course.title) ? "♥" : "♡"}</button></div>
        <span className="education-tag">{course.country}</span>\n        {course.verified && <span className="education-tag">Official university details</span>}
        <h2>{course.title}</h2>
        <p>{course.field}</p>
        <div className="education-meta"><span>{course.duration}</span><span>{course.mode}</span></div>
        <small>{course.note}</small>\n        {course.eligibility && <p className="education-source"><b>Eligibility:</b> {course.eligibility}</p>}\n        {course.fee && <p className="education-source"><b>Published fee:</b> {course.fee}</p>}
        <p className="education-source">Official reference: <b>{course.institution}</b></p>
        <a className="primary" href={course.officialUrl} target="_blank" rel="noopener noreferrer">University course details ↗</a>\n        {course.recognitionUrl && <a className="secondary" href={course.recognitionUrl} target="_blank" rel="noopener noreferrer">Check UGC-DEB listing ↗</a>}
        <button type="button" className="secondary" onClick={() => { setSelected(course); setNotice(""); }}>Enquire / Add to CRM</button>
      </article>)}
      {!filtered.length && <p className="education-empty">No matching pathways. Try changing your filters.</p>}
    </div>
    {selected && <div className="education-enquiry-overlay" role="dialog" aria-modal="true"><form className="education-enquiry-panel" onSubmit={submitEnquiry}><button type="button" onClick={() => setSelected(null)}>Close ×</button><h2>Course enquiry: {selected.title}</h2><label>Student name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Contact (optional)<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label><label><input type="checkbox" required checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/> I consent to save this enquiry in SHIVASHA CRM for follow-up.</label><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save enquiry"}</button>{notice && <p role="status">{notice}</p>}</form></div>}
    {notice && !selected && <p role="status">{notice}</p>}
    <footer className="education-disclaimer">SHIVASHA listings are informational examples, not admissions offers. Before applying, verify current fees, deadlines, accreditation, eligibility and visa rules through official university sources.</footer>
  </section>;
}
