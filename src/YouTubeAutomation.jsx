import React, { useMemo, useState } from "react";

const formats = [
  { id: "short", label: "YouTube Shorts", ratio: "9:16", duration: "15–180 sec" },
  { id: "long", label: "Long Video", ratio: "16:9", duration: "3–60 min" },
];

export default function YouTubeAutomation({ auth }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ title: "", topic: "", language: "Hindi", format: "short", audience: "", duration: "60" });
  const [notice, setNotice] = useState("");
  const selected = formats.find(x => x.id === form.format);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const createProject = event => {
    event.preventDefault();
    if (!form.topic.trim()) return;
    const project = {
      id: `yt-${Date.now()}`,
      title: form.title.trim() || form.topic.trim(),
      topic: form.topic.trim(),
      language: form.language,
      format: form.format,
      duration: form.duration,
      status: "Draft",
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [project, ...prev]);
    setNotice("Project draft created in this session. Persistent server storage is not connected yet.");
    setForm(prev => ({ ...prev, title: "", topic: "" }));
  };

  const removeProject = id => setProjects(prev => prev.filter(p => p.id !== id));

  return <section className="content">
    <div className="feed-head">
      <div><h2>SHIVASHA YouTube Automation</h2><p>Create, organize, review and prepare Shorts and long-form video projects.</p></div>
      <span className="yt-status">● Workspace preview</span>
    </div>
    <div className="yt-hero panel">
      <div className="yt-hero-icon">▶</div>
      <div><h3>From idea to YouTube-ready video</h3><p>Plan your content in Hindi, English and more languages. Publishing will be enabled after secure Google channel authorization and backend setup.</p></div>
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
        <button className="primary" type="submit">Create draft project</button>
        {notice && <p className="yt-notice" role="status">{notice}</p>}
      </form>
      <div className="panel yt-pipeline">
        <h3>Automation pipeline</h3>
        {["1. Topic & audience","2. AI script + SEO metadata","3. Voice-over, captions & assets","4. Video render & preview","5. Your approval","6. Schedule / publish","7. Analytics"].map((step,i)=><div className="yt-pipeline-step" key={step}><span>{i+1}</span>{step}<small>{i===0?"Available":i===4?"Required":"Planned"}</small></div>)}
        <p className="yt-disclaimer">No video is uploaded or published automatically in this preview. You remain in control of final approval.</p>
      </div>
    </div>
    <div className="panel yt-projects">
      <div className="yt-projects-head"><h3>Your video projects</h3><span>{projects.length} drafts</span></div>
      {!projects.length ? <div className="yt-empty"><span>▧</span><b>No projects yet</b><p>Create a draft above to start your content workflow.</p></div> : projects.map(project=><article className="yt-project" key={project.id}>
        <div className="yt-project-thumb">{project.format === "short" ? "▯" : "▶"}</div><div className="yt-project-info"><b>{project.title}</b><p>{project.language} · {project.format === "short" ? "Short" : "Long video"} · {project.duration}s target</p><small>{project.topic}</small></div><span className="yt-draft-badge">{project.status}</span><button type="button" className="yt-remove" onClick={()=>removeProject(project.id)} aria-label="Remove draft">×</button>
      </article>)}
    </div>
  </section>;
}
