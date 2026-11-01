import React, { useMemo, useState } from "react";

const COURSES = [
  { title: "B.Sc. Computer Science", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "On-campus", duration: "Typically 3–4 years", officialUrl: "https://www.google.com/search?q=site%3A.ac.in+BSc+Computer+Science+official+university+course", details: "Verify curriculum, eligibility, fees and admission dates on the institution's official website." },
  { title: "BCA", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "Online / On-campus", duration: "Typically 3–4 years", officialUrl: "https://www.google.com/search?q=site%3A.ac.in+BCA+official+university+course", details: "Official course information varies by university and delivery mode." },
  { title: "B.Tech Computer Science", degree: "Bachelor", field: "Engineering", country: "India", mode: "On-campus", duration: "Typically 4 years", officialUrl: "https://www.google.com/search?q=site%3A.ac.in+BTech+Computer+Science+official+university+course", details: "Verify entrance requirements, accreditation and admissions on the official website." },
  { title: "M.Sc. Data Science", degree: "Master", field: "Data & AI", country: "United Kingdom", mode: "On-campus / Online", duration: "Typically 1–2 years", officialUrl: "https://www.google.com/search?q=site%3A.ac.uk+MSc+Data+Science+official+course", details: "Check entry requirements, international tuition and application deadlines." },
  { title: "M.S. Computer Science", degree: "Master", field: "Computer Science & IT", country: "United States", mode: "On-campus", duration: "Typically 1–2 years", officialUrl: "https://www.google.com/search?q=site%3A.edu+MS+Computer+Science+official+program", details: "Review program requirements and total cost through official admissions information." },
  { title: "MBA", degree: "Master", field: "Business & Management", country: "Canada", mode: "On-campus / Online", duration: "Typically 1–2 years", officialUrl: "https://www.google.com/search?q=site%3A.ca+MBA+official+university+program", details: "Work experience and admission tests vary by institution." },
  { title: "B.Sc. Nursing", degree: "Bachelor", field: "Medical & Healthcare", country: "Australia", mode: "On-campus", duration: "Typically 3 years", officialUrl: "https://www.google.com/search?q=site%3A.edu.au+Bachelor+Nursing+official+course", details: "Confirm professional registration, clinical placement and eligibility." },
  { title: "Bachelor of Laws (LLB)", degree: "Bachelor", field: "Law", country: "India", mode: "On-campus", duration: "Typically 3 years after graduation", officialUrl: "https://www.google.com/search?q=site%3A.ac.in+LLB+official+university+course", details: "Verify recognition and eligibility with the university and relevant regulator." },
  { title: "PhD in Artificial Intelligence", degree: "PhD", field: "Data & AI", country: "Germany", mode: "Research", duration: "Typically 3–5 years", officialUrl: "https://www.google.com/search?q=site%3A.de+PhD+Artificial+Intelligence+official+university", details: "Funding, supervisor availability and admission criteria vary." },
  { title: "Master of Public Health", degree: "Master", field: "Medical & Healthcare", country: "Singapore", mode: "On-campus", duration: "Typically 1–2 years", officialUrl: "https://www.google.com/search?q=site%3A.edu.sg+Master+Public+Health+official+course", details: "Check current entry criteria, tuition and recognition." },
  { title: "BA Psychology", degree: "Bachelor", field: "Arts & Humanities", country: "United States", mode: "On-campus / Online", duration: "Typically 3–4 years", officialUrl: "https://www.google.com/search?q=site%3A.edu+BA+Psychology+official+program", details: "Professional licensing may require additional education and supervised practice." },
  { title: "M.Ed.", degree: "Master", field: "Education", country: "India", mode: "On-campus / Online", duration: "Typically 2 years", officialUrl: "https://www.google.com/search?q=site%3A.ac.in+MEd+official+university+course", details: "Verify current recognition and eligibility with the institution." }
];
const countries = ["All countries", ...new Set(COURSES.map(c => c.country))];
const fields = ["All subjects", ...new Set(COURSES.map(c => c.field))];
const degrees = ["All degrees", "Bachelor", "Master", "PhD"];
const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");

export default function GlobalEducation({ auth }) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All countries");
  const [field, setField] = useState("All subjects");
  const [degree, setDegree] = useState("All degrees");
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", contact: "", city: "", note: "", consent: false });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => COURSES.filter(c =>
    (country === "All countries" || c.country === country) &&
    (field === "All subjects" || c.field === field) &&
    (degree === "All degrees" || c.degree === degree) &&
    (c.title + " " + c.field + " " + c.country).toLowerCase().includes(search.toLowerCase())
  ), [search, country, field, degree]);

  const submitEnquiry = async e => {
    e.preventDefault();
    if (!auth?.token) { setNotice("Please sign in to submit a course enquiry to your CRM."); return; }
    if (!form.consent) { setNotice("Consent is required before submitting this enquiry."); return; }
    setSaving(true); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/business/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify({
          name: form.name.trim(),
          contact: form.contact.trim(),
          business: "Education enquiry · " + selected.title + " · " + selected.country,
          stage: "New",
          notes: ["Course: " + selected.title, "Country: " + selected.country, "Subject: " + selected.field, "Official info search: " + selected.officialUrl, "City: " + form.city.trim(), "Question: " + form.note.trim(), "Consent: student agreed to course-related follow-up"].join("\n")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "CRM could not save the enquiry.");
      setNotice("Course enquiry saved to SHIVASHA CRM.");
      setForm({ name: "", contact: "", city: "", note: "", consent: false });
      setSelected(null);
    } catch (error) { setNotice(error.message || "CRM connection unavailable."); }
    finally { setSaving(false); }
  };

  return <section className="global-education">
    <header className="education-hero">
      <span className="education-eyebrow">SHIVASHA • GLOBAL LEARNING</span>
      <h1>Global Degree Courses</h1>
      <p>Explore degree pathways and open official university information for verification.</p>
      <label className="education-search">⌕ <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search degree, subject or country" /></label>
    </header>
    <div className="education-filters">
      <select aria-label="Country" value={country} onChange={e => setCountry(e.target.value)}>{countries.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Subject" value={field} onChange={e => setField(e.target.value)}>{fields.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Degree" value={degree} onChange={e => setDegree(e.target.value)}>{degrees.map(x => <option key={x}>{x}</option>)}</select>
    </div>
    <div className="education-results"><b>{filtered.length} course pathways</b><span>Official university search links • verify details on source websites</span></div>
    <div className="education-grid">
      {filtered.map(course => <article className="education-card" key={course.title + course.country}>
        <div className="education-card-top"><span className="education-icon">🎓</span><button type="button" aria-label="Save course" className={saved.includes(course.title) ? "saved" : ""} onClick={() => setSaved(prev => prev.includes(course.title) ? prev.filter(x => x !== course.title) : [...prev, course.title])}>{saved.includes(course.title) ? "♥" : "♡"}</button></div>
        <span className="education-tag">{course.country}</span><h2>{course.title}</h2><p>{course.field}</p>
        <div className="education-meta"><span>{course.duration}</span><span>{course.mode}</span></div>
        <small>{course.details}</small>
        <div className="education-actions"><a href={course.officialUrl} target="_blank" rel="noopener noreferrer">Official course details ↗</a><button type="button" onClick={() => {setSelected(course);setNotice("");}}>Enquire / Add to CRM</button></div>
      </article>)}
      {!filtered.length && <p className="education-empty">No matching pathways. Try changing your filters.</p>}
    </div>
    {selected && <div className="education-enquiry-overlay" role="dialog" aria-modal="true" aria-labelledby="education-enquiry-title"><form className="education-enquiry" onSubmit={submitEnquiry}>
      <button type="button" className="education-close" aria-label="Close enquiry" onClick={() => setSelected(null)}>×</button><h2 id="education-enquiry-title">Course enquiry</h2><p><b>{selected.title}</b> · {selected.country}</p>
      <label>Student name *<input required maxLength="120" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Contact (optional)<input maxLength="160" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Email or phone"/></label>
      <label>City (optional)<input maxLength="100" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
      <label>Question (optional)<textarea maxLength="1000" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="What would you like to know?"/></label>
      <label className="education-consent"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})} required/> I consent to submit this enquiry to SHIVASHA CRM for course-related follow-up.</label>
      <button type="submit" disabled={saving}>{saving?"Saving…":"Submit to CRM"}</button>{notice&&<p role="status">{notice}</p>}
    </form></div>}
    <footer className="education-disclaimer">These are course pathways, not verified admissions offers. Official links open university-domain searches; confirm exact program, fees, eligibility, recognition and deadlines directly with the institution.</footer>
  </section>;
}
