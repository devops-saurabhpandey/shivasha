import React, { useMemo, useState } from "react";

const COURSES = [
  { title: "B.Sc. Computer Science", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "On-campus", duration: "3 years", level: "Undergraduate", note: "Check university-specific eligibility and recognition." },
  { title: "BCA", degree: "Bachelor", field: "Computer Science & IT", country: "India", mode: "Online / On-campus", duration: "3 years", level: "Undergraduate", note: "Compare curriculum, accreditation and fees." },
  { title: "B.Tech Computer Science", degree: "Bachelor", field: "Engineering", country: "India", mode: "On-campus", duration: "4 years", level: "Undergraduate", note: "Admission requirements vary by institution." },
  { title: "M.Sc. Data Science", degree: "Master", field: "Data & AI", country: "United Kingdom", mode: "On-campus / Online", duration: "1–2 years", level: "Postgraduate", note: "Check entry requirements and international tuition." },
  { title: "M.S. Computer Science", degree: "Master", field: "Computer Science & IT", country: "United States", mode: "On-campus", duration: "1–2 years", level: "Postgraduate", note: "Review program accreditation and total cost." },
  { title: "MBA", degree: "Master", field: "Business & Management", country: "Canada", mode: "On-campus / Online", duration: "1–2 years", level: "Postgraduate", note: "Work experience and admission tests may be required." },
  { title: "B.Sc. Nursing", degree: "Bachelor", field: "Medical & Healthcare", country: "Australia", mode: "On-campus", duration: "3 years", level: "Undergraduate", note: "Verify professional registration requirements." },
  { title: "Bachelor of Laws (LLB)", degree: "Bachelor", field: "Law", country: "India", mode: "On-campus", duration: "3 years", level: "Undergraduate", note: "Confirm recognition with the relevant legal authority." },
  { title: "PhD in Artificial Intelligence", degree: "PhD", field: "Data & AI", country: "Germany", mode: "Research", duration: "3–5 years", level: "Research", note: "Funding and supervisor availability vary." },
  { title: "Master of Public Health", degree: "Master", field: "Medical & Healthcare", country: "Singapore", mode: "On-campus", duration: "1–2 years", level: "Postgraduate", note: "Check entry criteria and recognition." },
  { title: "BA Psychology", degree: "Bachelor", field: "Arts & Humanities", country: "United States", mode: "On-campus / Online", duration: "3–4 years", level: "Undergraduate", note: "Professional licensing usually requires further study." },
  { title: "M.Ed.", degree: "Master", field: "Education", country: "India", mode: "On-campus / Online", duration: "2 years", level: "Postgraduate", note: "Check university and regulatory recognition." }
];

const countries = ["All countries", ...new Set(COURSES.map(c => c.country))];
const fields = ["All subjects", ...new Set(COURSES.map(c => c.field))];
const degrees = ["All degrees", "Bachelor", "Master", "PhD"];

export default function GlobalEducation() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All countries");
  const [field, setField] = useState("All subjects");
  const [degree, setDegree] = useState("All degrees");
  const [saved, setSaved] = useState([]);
  const filtered = useMemo(() => COURSES.filter(c =>
    (country === "All countries" || c.country === country) &&
    (field === "All subjects" || c.field === field) &&
    (degree === "All degrees" || c.degree === degree) &&
    (c.title + " " + c.field + " " + c.country).toLowerCase().includes(search.toLowerCase())
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
    <div className="education-results"><b>{filtered.length} course pathways</b><span>Sample listings • verify details with the institution</span></div>
    <div className="education-grid">
      {filtered.map((course, i) => <article className="education-card" key={course.title + course.country}>
        <div className="education-card-top"><span className="education-icon">🎓</span><button type="button" aria-label="Save course" className={saved.includes(course.title) ? "saved" : ""} onClick={() => setSaved(prev => prev.includes(course.title) ? prev.filter(x => x !== course.title) : [...prev, course.title])}>{saved.includes(course.title) ? "♥" : "♡"}</button></div>
        <span className="education-tag">{course.country}</span>
        <h2>{course.title}</h2>
        <p>{course.field}</p>
        <div className="education-meta"><span>{course.duration}</span><span>{course.mode}</span></div>
        <small>{course.note}</small>
      </article>)}
      {!filtered.length && <p className="education-empty">No matching pathways. Try changing your filters.</p>}
    </div>
    <footer className="education-disclaimer">SHIVASHA listings are informational examples, not admissions offers. Before applying, verify current fees, deadlines, accreditation, eligibility and visa rules through official university sources.</footer>
  </section>;
}
