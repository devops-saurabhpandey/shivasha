import { useMemo, useState } from "react";
import "./UIUXDesigner.css";

const starterTemplates = [
  { id: "education", name: "Education landing page", target: "website", description: "A welcoming learning platform with courses and progress.", primary: "#5b4bdb" },
  { id: "jobs", name: "Job search mobile app", target: "mobile", description: "Search jobs, filter by city, and save opportunities.", primary: "#087f8c" },
  { id: "business", name: "Business dashboard", target: "website", description: "A clean dashboard with metrics, activity, and quick actions.", primary: "#2563eb" }
];

export default function UIUXDesigner() {
  const [target, setTarget] = useState("website");
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState(starterTemplates[0]);
  const [projectName, setProjectName] = useState("My design");
  const [notice, setNotice] = useState("");

  const preview = useMemo(() => ({
    ...selected,
    name: projectName.trim() || selected.name,
    description: prompt.trim() || selected.description
  }), [selected, projectName, prompt]);

  function chooseTemplate(template) {
    setSelected(template);
    setTarget(template.target);
    setNotice("Template loaded into preview.");
  }

  function exportPreview() {
    const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${preview.name}</title>
<style>body{font:16px system-ui;margin:0;background:#f6f7fb;color:#172033}main{max-width:900px;margin:8vh auto;padding:40px;background:white;border-radius:24px}a,button{background:${preview.primary};color:white;padding:12px 18px;border:0;border-radius:10px;text-decoration:none}small{color:#667085}</style>
<main><small>SHIVASHA DESIGN STUDIO · ${target.toUpperCase()}</small><h1>${preview.name.replace(/[<>]/g, "")}</h1><p>${preview.description.replace(/[<>]/g, "")}</p><a href="#">Get started</a></main></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shivasha-design-preview.html";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("HTML preview exported.");
  }

  return (
    <section className="uxd-page">
      <header className="uxd-header">
        <div><p className="uxd-eyebrow">SHIVASHA · AI TOOLS</p><h1>UI/UX Designer</h1><p>Create and preview website or mobile app concepts.</p></div>
        <span className="uxd-chip">Studio preview</span>
      </header>
      <div className="uxd-layout">
        <aside className="uxd-panel">
          <label className="uxd-label" htmlFor="uxd-project">Project name</label>
          <input id="uxd-project" value={projectName} onChange={e => setProjectName(e.target.value)} />
          <span className="uxd-label">Design for</span>
          <div className="uxd-switch">
            <button className={target === "website" ? "active" : ""} onClick={() => setTarget("website")}>Website</button>
            <button className={target === "mobile" ? "active" : ""} onClick={() => setTarget("mobile")}>Mobile</button>
          </div>
          <label className="uxd-label" htmlFor="uxd-prompt">Describe your idea</label>
          <textarea id="uxd-prompt" rows="4" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="E.g. a modern online learning dashboard..." />
          <p className="uxd-help">AI generation will be connected after a secure server-side provider is configured. For now, try a starter template.</p>
          <button className="uxd-primary" onClick={exportPreview}>Export HTML preview</button>
          {notice && <p className="uxd-notice" role="status">{notice}</p>}
        </aside>
        <div className="uxd-workspace">
          <div className="uxd-workspace-top"><strong>Live preview</strong><span>{target === "mobile" ? "Mobile screen" : "Desktop page"}</span></div>
          <div className={target === "mobile" ? "uxd-canvas mobile" : "uxd-canvas"}>
            <div className="uxd-preview" style={{ "--uxd-primary": selected.primary }}>
              <div className="uxd-preview-nav"><b>SHIVASHA</b><span>Explore&nbsp;&nbsp; About</span></div>
              <div className="uxd-hero"><span className="uxd-kicker">DESIGNED TO HELP YOU GROW</span><h2>{preview.name}</h2><p>{preview.description}</p><button>Get started ↗</button></div>
              <div className="uxd-preview-cards"><div><b>Discover</b><p>Find what matters to you.</p></div><div><b>Learn</b><p>Build skills at your pace.</p></div></div>
            </div>
          </div>
          <div className="uxd-templates"><h3>Start with a template</h3><div className="uxd-template-grid">{starterTemplates.map(t => <button key={t.id} className={selected.id === t.id ? "uxd-template selected" : "uxd-template"} onClick={() => chooseTemplate(t)}><span className="uxd-template-dot" style={{ background: t.primary }} /><b>{t.name}</b><small>{t.target}</small></button>)}</div></div>
        </div>
      </div>
    </section>
  );
}
