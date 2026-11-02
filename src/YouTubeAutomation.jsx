import React, { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const formats = [
  { id: "short", label: "YouTube Shorts", ratio: "9:16", duration: "15–180 sec" },
  { id: "long", label: "Long Video", ratio: "16:9", duration: "3–60 min" },
];

export default function YouTubeAutomation({ auth }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ title: "", topic: "", language: "Hindi", format: "short", audience: "", duration: "60" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState("");
  const selected = formats.find(x => x.id === form.format);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const headers = { "Content-Type": "application/json", ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}) };

  useEffect(() => {
    let cancelled = false;
    if (!auth?.token) {
      setProjects([]);
      setNotice("Sign in to save and load projects securely.");
      return () => { cancelled = true; };
    }
    setLoading(true);
    fetch(API_BASE + "/api/youtube-automation/projects", { headers: { Authorization: "Bearer " + auth.token } })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Could not load projects");
        if (!cancelled) {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
          setNotice("");
        }
      })
      .catch(error => { if (!cancelled) setNotice(error.message || "Could not connect to SHIVASHA server"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth?.token]);

  const createProject = async event => {
    event.preventDefault();
    if (!form.topic.trim()) return;
    if (!auth?.token) { setNotice("Please sign in before creating a saved project."); return; }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects", {
        method: "POST", headers,
        body: JSON.stringify({ ...form, duration: Number(form.duration), title: form.title.trim() || form.topic.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save project");
      setProjects(prev => [data.project, ...prev]);
      setNotice("Project saved to your SHIVASHA account.");
      setForm(prev => ({ ...prev, title: "", topic: "" }));
    } catch (error) {
      setNotice(error.message || "Could not save project");
    } finally { setSaving(false); }
  };

  const generateScript = async id => {
    if (!auth?.token) { setNotice("Please sign in to generate a script."); return; }
    setGeneratingId(id);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id + "/generate-script", {
        method: "POST", headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Script generation failed");
      setProjects(prev => prev.map(project => project._id === id ? data.project : project));
      setNotice(data.disclaimer || "Script generated and saved.");
    } catch (error) { setNotice(error.message || "Script generation failed"); }
    finally { setGeneratingId(""); }
  };

  const removeProject = async id => {
    if (!auth?.token) return;
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id, {
        method: "DELETE", headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not delete project");
      setProjects(prev => prev.filter(project => project._id !== id));
      setNotice("Project deleted.");
    } catch (error) { setNotice(error.message || "Could not delete project"); }
  };

  return <section className="content">
    <div className="feed-head">
      <div><h2>SHIVASHA YouTube Automation</h2><p>Create, organize, review and prepare Shorts and long-form video projects.</p></div>
      <span className="yt-status">● Project workspace</span>
    </div>
    <div className="yt-hero panel">
      <div className="yt-hero-icon">▶</div>
      <div><h3>From idea to YouTube-ready video</h3><p>Plan content in Hindi, English and more languages. Publishing requires secure Google channel authorization and further setup.</p></div>
    </div>
    <div className="yt-format-grid">
      {formats.map(item => <button type="button" key={item.id} className={form.format === item.id ? "yt-format selected" : "yt-format"} onClick={() => update("format", item.id)}>
        <span className="yt-format-icon">{item.id === "short" ? "▯" : "▭"}</span><b>{item.label}</b><small>{item.ratio} · {item.duration}</small>
      </button>)}
    </div>
    <div className="yt-workspace-grid">
      <form className="panel yt-form" onSubmit={createProject}>
        <h3>＋ Create video project</h3>
        <label>Video topic *<textarea required rows="3" value={form.topic} onChange={e => update("topic", e.target.value)} placeholder="Example: 5 free AI tools for students"/></label>
        <label>Project title<input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Optional working title"/></label>
        <div className="yt-fields-row">
          <label>Language<select value={form.language} onChange={e => update("language", e.target.value)}><option>Hindi</option><option>English</option><option>Hinglish</option><option>Bengali</option><option>Marathi</option><option>Tamil</option><option>Telugu</option><option>Other</option></select></label>
          <label>Target duration<select value={form.duration} onChange={e => update("duration", e.target.value)}>{(form.format === "short" ? [["30","30 sec"],["60","60 sec"],["90","90 sec"],["180","3 min"]] : [["180","3 min"],["300","5 min"],["600","10 min"],["1200","20 min"],["1800","30 min"]]).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <button className="primary" type="submit" disabled={saving || !auth?.token}>{saving ? "Saving…" : "Create saved project"}</button>
        {notice && <p className="yt-notice" role="status">{notice}</p>}
      </form>
      <div className="panel yt-pipeline">
        <h3>Automation pipeline</h3>
        {["1. Topic & audience","2. AI script + SEO metadata","3. Voice-over, captions & assets","4. Video render & preview","5. Your approval","6. Schedule / publish","7. Analytics"].map((step,i)=><div className="yt-pipeline-step" key={step}><span>{i+1}</span>{step}<small>{i===0?"Available":i===4?"Required":"Planned"}</small></div>)}
        <p className="yt-disclaimer">This release saves project records. AI generation, video rendering and YouTube publishing are not yet active.</p>
      </div>
    </div>
    <div className="panel yt-projects">
      <div className="yt-projects-head"><h3>Your video projects</h3><span>{loading ? "Loading…" : projects.length + " projects"}</span></div>
      {!loading && !projects.length ? <div className="yt-empty"><span>▧</span><b>No saved projects yet</b><p>Create a project above to start your content workflow.</p></div> : projects.map(project=><article className="yt-project" key={project._id}>
        <div className="yt-project-thumb">{project.format === "short" ? "▯" : "▶"}</div><div className="yt-project-info"><b>{project.title}</b><p>{project.language} · {project.format === "short" ? "Short" : "Long video"} · {project.duration}s target</p><small>{project.topic}</small>{project.script && <details className="yt-script-preview"><summary>View generated script</summary><pre>{project.script}</pre></details>}</div><span className="yt-draft-badge">{project.status}</span><button type="button" className="primary" disabled={generatingId === project._id} onClick={()=>generateScript(project._id)}>{generatingId === project._id ? "Generating…" : project.script ? "Regenerate script" : "Generate AI script"}</button><button type="button" className="yt-remove" onClick={()=>removeProject(project._id)} aria-label="Remove project">×</button>
      </article>)}
    </div>
  </section>;
}
