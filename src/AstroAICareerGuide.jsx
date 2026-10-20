import React, { useMemo, useState } from "react";

const CAREERS = [
  { key: "technology", label: "Technology & IT", strengths: "problem-solving, systems thinking and continuous learning", paths: "IT support, software testing, web development, data/MIS reporting and Python automation" },
  { key: "business", label: "Business & Management", strengths: "communication, planning and practical decision-making", paths: "operations, project coordination, sales operations and business analysis" },
  { key: "finance", label: "Finance & Accounts", strengths: "accuracy, consistency and structured analysis", paths: "accounts support, financial operations, compliance and reporting" },
  { key: "creative", label: "Creative & Communication", strengths: "expression, imagination and understanding audiences", paths: "content writing, digital marketing, design coordination and community management" },
  { key: "teaching", label: "Teaching & Guidance", strengths: "patience, explaining ideas and helping others grow", paths: "teaching, training, instructional content and learning support" },
  { key: "entrepreneur", label: "Business / Entrepreneurship", strengths: "initiative, adaptability and spotting customer needs", paths: "small business, product building, customer success and digital services" }
];

function getZodiac(month, day) {
  const signs = [
    ["Capricorn",1,19],["Aquarius",2,18],["Pisces",3,20],["Aries",4,19],
    ["Taurus",5,20],["Gemini",6,20],["Cancer",7,22],["Leo",8,22],
    ["Virgo",9,22],["Libra",10,22],["Scorpio",11,21],["Sagittarius",12,21],["Capricorn",12,31]
  ];
  if (month === 1 && day <= 19) return "Capricorn";
  const sign = signs.find((s) => month === s[1] && day <= s[2]);
  if (sign) return sign[0];
  const next = signs.find((s) => s[1] === month);
  return next ? next[0] : "Enter a valid birth date";
}

export default function AstroAICareerGuide() {
  const [form, setForm] = useState({ birthDate: "", birthTime: "", birthplace: "", career: "technology", experience: "beginner", goal: "job" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => CAREERS.find((c) => c.key === form.career) || CAREERS[0], [form.career]);
  const sign = useMemo(() => {
    if (!form.birthDate) return "";
    const [year, month, day] = form.birthDate.split("-").map(Number);
    return getZodiac(month, day);
  }, [form.birthDate]);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.birthDate || !form.birthTime || !form.birthplace.trim()) {
      setError("Please enter birth date, birth time and birthplace to prepare your reading.");
      return;
    }
    setError("");
    setShow(true);
  };
  return <section className="content astro-career">
    <div className="astro-hero">
      <span className="astro-symbol" aria-hidden="true">✦</span>
      <div><span className="astro-kicker">SELF-DISCOVERY · CAREER PLANNING</span><h2>Astro AI Career Guide</h2><p>Explore astrology-inspired reflections alongside practical career steps.</p></div>
    </div>
    <div className="panel astro-note"><b>Important:</b> This is a reflective, astrology-inspired guide—not a scientific prediction or a guarantee of career success. Use your skills, interests, qualifications and real-world opportunities to make decisions.</div>
    <form className="panel astro-form" onSubmit={submit}>
      <h3>Your birth details</h3><p className="astro-muted">Birth time and place help personalize the traditional astrology-style reflection. They are not sent to a server by this guide.</p>
      <div className="astro-grid">
        <label>Birth date<input type="date" value={form.birthDate} onChange={e=>update("birthDate",e.target.value)} required /></label>
        <label>Birth time<input type="time" value={form.birthTime} onChange={e=>update("birthTime",e.target.value)} required /></label>
        <label className="astro-wide">Birthplace (city, state/country)<input value={form.birthplace} onChange={e=>update("birthplace",e.target.value)} placeholder="e.g. Kanpur, Uttar Pradesh, India" required /></label>
        <label>Career area<select value={form.career} onChange={e=>update("career",e.target.value)}>{CAREERS.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}</select></label>
        <label>Current experience<select value={form.experience} onChange={e=>update("experience",e.target.value)}><option value="beginner">Starting / learning</option><option value="some">Some experience</option><option value="experienced">Experienced / career switch</option></select></label>
        <label className="astro-wide">Main goal<select value={form.goal} onChange={e=>update("goal",e.target.value)}><option value="job">Get a job</option><option value="switch">Change career</option><option value="growth">Grow in current career</option><option value="business">Start a business</option><option value="study">Choose what to study</option></select></label>
      </div>
      {error&&<p className="astro-error" role="alert">{error}</p>}
      <button className="primary" type="submit">Generate career guide ✦</button>
    </form>
    {show&&<div className="panel astro-results" aria-live="polite">
      <div className="astro-result-top"><span className="astro-result-icon">✧</span><div><span className="astro-kicker">YOUR PERSONAL REFLECTION</span><h3>{sign} · Career direction</h3></div></div>
      <p>Using your selected area of <b>{selected.label}</b>, treat the {sign} sun-sign theme as a prompt for reflection—not a fixed description of your personality or destiny.</p>
      <h4>Strengths to build on</h4><p>{selected.strengths}. Look for evidence of these strengths in your work, projects and feedback from others.</p>
      <h4>Career paths to explore</h4><p>{selected.paths}.</p>
      <h4>Your practical next steps</h4>
      <ol><li>Write down three skills you already have and two you need to improve.</li><li>Choose one target role and review 10 current job descriptions for repeated requirements.</li><li>Build one small portfolio project or work sample relevant to that role.</li><li>Set a weekly learning and application target, then review progress after 30 days.</li></ol>
      <div className="astro-plan"><b>Goal focus:</b> {({job:"Prepare a role-specific resume and apply consistently.",switch:"Map transferable skills and create a 30-day transition plan.",growth:"Ask for measurable responsibilities and identify one skill gap.",business:"Validate a customer problem and test a small offer before investing heavily.",study:"Compare course outcomes, costs and job requirements before enrolling."})[form.goal]}</div>
      <p className="astro-muted">Birth time: {form.birthTime} · Birthplace: {form.birthplace}. This prototype does not calculate a Vedic birth chart, ascendant, houses or planetary positions. For more useful guidance, combine this reflection with your actual education, experience and interests.</p>
      <button className="secondary" onClick={()=>setShow(false)}>Edit details</button>
    </div>}
  </section>;
}
