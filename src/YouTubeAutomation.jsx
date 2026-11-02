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
  const [scriptEdits, setScriptEdits] = useState({});
  const [savingScriptId, setSavingScriptId] = useState("");
  const [generatingSeoId, setGeneratingSeoId] = useState("");
  const [generatingCaptionsId, setGeneratingCaptionsId] = useState("");
  const [generatingVoiceoverId, setGeneratingVoiceoverId] = useState("");
  const [generatingStoryboardId, setGeneratingStoryboardId] = useState("");
  const [renderingId, setRenderingId] = useState("");
  const [voiceovers, setVoiceovers] = useState({});
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

  const queueRender = async id => {
    if (!auth?.token) { setNotice("Please sign in to queue a render."); return; }
    setRenderingId(id); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube/projects/" + id + "/render-job", {
        method: "POST", headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not queue render");
      setProjects(prev => prev.map(project => project._id === id ? { ...project, renderStatus: data.status || "queued", renderError: "" } : project));
      setNotice("Render job queued. Keep the SHIVASHA render worker online.");
    } catch (error) { setNotice(error.message || "Could not queue render"); }
    finally { setRenderingId(""); }
  };

  useEffect(() => {
    if (!auth?.token || !projects.some(p => ["queued", "running"].includes(p.renderStatus))) return;
    const timer = setInterval(async () => {
      const active = projects.filter(p => ["queued", "running"].includes(p.renderStatus));
      for (const project of active) {
        try {
          const response = await fetch(API_BASE + "/api/youtube/projects/" + project._id + "/render-status", {
            headers: { Authorization: "Bearer " + auth.token }
          });
          if (!response.ok) continue;
          const data = await response.json();
          setProjects(prev => prev.map(item => item._id === project._id ? { ...item, renderStatus: data.status || item.renderStatus, renderOutputUrl: data.outputUrl ?? item.renderOutputUrl ?? "", renderError: data.error ?? item.renderError ?? "" } : item));
        } catch { /* Retry on the next polling cycle. */ }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [auth?.token, projects]);

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

  const generateSeo = async id => {
    if (!auth?.token) { setNotice("Please sign in to generate SEO metadata."); return; }
    setGeneratingSeoId(id);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id + "/generate-seo", {
        method: "POST", headers: { Authorization: "Bearer " + auth.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "SEO generation failed");
      setProjects(prev => prev.map(project => project._id === id ? data.project : project));
      setNotice(data.disclaimer || "SEO metadata generated and saved.");
    } catch (error) { setNotice(error.message || "SEO generation failed"); }
    finally { setGeneratingSeoId(""); }
  };


  const generateCaptions = async id => {
    if (!auth?.token) { setNotice("Please sign in to generate captions."); return; }
    setGeneratingCaptionsId(id); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id + "/generate-captions", { method: "POST", headers: { Authorization: "Bearer " + auth.token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Caption generation failed");
      setProjects(prev => prev.map(project => project._id === id ? data.project : project));
      setNotice(data.disclaimer || "SRT captions generated.");
    } catch (error) { setNotice(error.message || "Caption generation failed"); }
    finally { setGeneratingCaptionsId(""); }
  };

  const generateStoryboard = async id => {
    if (!auth?.token) { setNotice("Please sign in to generate a storyboard."); return; }
    setGeneratingStoryboardId(id); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id + "/generate-storyboard", { method: "POST", headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Storyboard generation failed");
      setProjects(prev => prev.map(project => project._id === id ? data.project : project));
      setNotice(data.disclaimer || "Storyboard generated and saved.");
    } catch (error) { setNotice(error.message || "Storyboard generation failed"); }
    finally { setGeneratingStoryboardId(""); }
  };

  const generateVoiceover = async id => {
    if (!auth?.token) { setNotice("Please sign in to generate a voice-over."); return; }
    setGeneratingVoiceoverId(id); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + id + "/generate-voiceover", {
        method: "POST", headers, body: JSON.stringify({ voice: "alloy" })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Voice-over generation failed");
      }
      const contentType = response.headers.get("content-type") || "";
      const projectTitle = projects.find(p => p._id === id)?.title || "shivasha-voiceover";
      const fileName = projectTitle.replace(/[^a-z0-9-_]/gi, "_") + ".mp3";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (!data.voiceoverUrl) throw new Error(data.message || "Stored voice-over URL was not returned.");
        setProjects(prev => prev.map(project => project._id === id ? { ...project, voiceoverUrl: data.voiceoverUrl } : project));
        setVoiceovers(prev => ({ ...prev, [id]: { url: data.voiceoverUrl, name: fileName, stored: true } }));
        setNotice("Voice-over generated and stored in Cloudinary.");
      } else {
        const audioBlob = await response.blob();
        if (!audioBlob.size) throw new Error("The voice-over file was empty.");
        setVoiceovers(prev => {
          if (prev[id]?.url?.startsWith("blob:")) URL.revokeObjectURL(prev[id].url);
          return { ...prev, [id]: { url: URL.createObjectURL(audioBlob), name: fileName, stored: false } };
        });
        setNotice("Voice-over generated. Download the MP3; configure Cloudinary for persistent storage.");
      }
    } catch (error) { setNotice(error.message || "Voice-over generation failed"); }
    finally { setGeneratingVoiceoverId(""); }
  };

  const saveScript = async project => {
    if (!auth?.token) return;
    const script = scriptEdits[project._id] ?? project.script ?? "";
    setSavingScriptId(project._id);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + project._id, {
        method: "PATCH", headers,
        body: JSON.stringify({ script, status: "Script ready" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save script");
      setProjects(prev => prev.map(item => item._id === project._id ? data.project : item));
      setScriptEdits(prev => { const next = { ...prev }; delete next[project._id]; return next; });
      setNotice("Edited script saved to your account.");
    } catch (error) { setNotice(error.message || "Could not save script"); }
    finally { setSavingScriptId(""); }
  };

  const [assetEdits, setAssetEdits] = useState({});
  const [savingAssetsId, setSavingAssetsId] = useState("");
  const saveSceneAssets = async project => {
    if (!auth?.token) { setNotice("Please sign in to save scene assets."); return; }
    const raw = assetEdits[project._id] ?? project.sceneAssets ?? "[]";
    let assets;
    try { assets = JSON.parse(raw); } catch { setNotice("Scene assets must be valid JSON."); return; }
    if (!Array.isArray(assets) || assets.length > 30) { setNotice("Provide a JSON array with up to 30 scene assets."); return; }
    const safeAssets = assets.map((item, index) => ({
      scene: Math.max(1, Math.min(30, Number(item.scene) || index + 1)),
      type: ["video", "image"].includes(item.type) ? item.type : "video",
      url: typeof item.url === "string" ? item.url.trim().slice(0, 2000) : "",
      duration: Math.max(1, Math.min(600, Number(item.duration) || 5)),
      attribution: typeof item.attribution === "string" ? item.attribution.trim().slice(0, 500) : ""
    }));
    setSavingAssetsId(project._id); setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/youtube-automation/projects/" + project._id, {
        method: "PATCH", headers, body: JSON.stringify({ sceneAssets: safeAssets })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save scene assets");
      setProjects(prev => prev.map(item => item._id === project._id ? data.project : item));
      setAssetEdits(prev => { const next = { ...prev }; delete next[project._id]; return next; });
      setNotice("Scene asset references saved. URLs must point to media you own or are licensed to use.");
    } catch (error) { setNotice(error.message || "Could not save scene assets"); }
    finally { setSavingAssetsId(""); }
  };

  const getRenderReadiness = project => {
    let scenes = [];
    try {
      const parsed = JSON.parse(project.storyboard || "[]");
      scenes = Array.isArray(parsed) ? parsed : [];
    } catch { scenes = []; }
    const checks = [
      { label: "Script", done: Boolean(project.script?.trim()) },
      { label: "Storyboard", done: scenes.length > 0 },
      { label: "SRT captions", done: Boolean(project.captions?.includes("-->")) },
      { label: "Voice-over", done: Boolean(project.voiceoverUrl || voiceovers[project._id]?.url) },
      { label: "Scene media", done: false }
    ];
    return { scenes, checks, ready: checks.every(item => item.done) };
  };

  const downloadRenderPackage = project => {
    const packageData = {
      app: "SHIVASHA YouTube Automation",
      project: {
        id: project._id, title: project.title, topic: project.topic,
        language: project.language, format: project.format,
        aspectRatio: project.format === "short" ? "9:16" : "16:9",
        targetDurationSeconds: project.duration,
        script: project.script || "", captionsSrt: project.captions || "",
        storyboard: project.storyboard ? (() => { try { return JSON.parse(project.storyboard); } catch { return project.storyboard; } })() : [],
        voiceoverUrl: project.voiceoverUrl || "",
        sceneAssets: project.sceneAssets || [],
        seo: { description: project.description || "", tags: project.tags || [] }
      },
      renderRequirements: { videoCodec: "H.264", audioCodec: "AAC", frameRate: 30, subtitles: "SRT", note: "Render manifest only—not an MP4. Use licensed or original media." }
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = (project.title || "shivasha-video").replace(/[^a-z0-9-_]/gi, "_") + "-render-package.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Render package exported. This contains project instructions, not an MP4 video.");
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
        <p className="yt-disclaimer">AI-assisted preparation is available. Video rendering requires the configured persistent worker; YouTube publishing still requires secure channel authorization.</p>
      </div>
    </div>
    <div className="panel yt-projects">
      <div className="yt-projects-head"><h3>Your video projects</h3><span>{loading ? "Loading…" : projects.length + " projects"}</span></div>
      {!loading && !projects.length ? <div className="yt-empty"><span>▧</span><b>No saved projects yet</b><p>Create a project above to start your content workflow.</p></div> : projects.map(project=><article className="yt-project" key={project._id}>
        <div className="yt-project-thumb">{project.format === "short" ? "▯" : "▶"}</div><div className="yt-project-info"><b>{project.title}</b><p>{project.language} · {project.format === "short" ? "Short" : "Long video"} · {project.duration}s target</p><small>{project.topic}</small>{(project.description || project.tags?.length) && <details className="yt-script-preview"><summary>View SEO title, description & tags</summary><p><b>Title:</b> {project.title}</p><p>{project.description}</p><p><b>Tags:</b> {(project.tags || []).join(", ")}</p></details>}{<button type="button" className="primary" disabled={generatingSeoId === project._id} onClick={()=>generateSeo(project._id)}>{generatingSeoId === project._id ? "Generating SEO…" : "Generate SEO metadata"}</button>}{project.script && <button type="button" className="primary" disabled={generatingStoryboardId === project._id} onClick={()=>generateStoryboard(project._id)}>{generatingStoryboardId === project._id ? "Planning shots…" : project.storyboard ? "Regenerate storyboard" : "Generate AI storyboard"}</button>}{project.storyboard && <details className="yt-script-preview"><summary>Review storyboard / shot list</summary><textarea rows="10" readOnly value={project.storyboard} aria-label={"Storyboard for "+project.title}/><a className="primary" download={(project.title || "video").replace(/[^a-z0-9-_]/gi,"_")+"-storyboard.json"} href={"data:application/json;charset=utf-8,"+encodeURIComponent(project.storyboard)}>Download shot list</a></details>}{project.script && <button type="button" className="primary" disabled={generatingCaptionsId === project._id} onClick={()=>generateCaptions(project._id)}>{generatingCaptionsId === project._id ? "Generating captions…" : project.captions ? "Regenerate SRT captions" : "Generate SRT captions"}</button>}{project.script && <button type="button" className="primary" disabled={generatingVoiceoverId === project._id} onClick={()=>generateVoiceover(project._id)}>{generatingVoiceoverId === project._id ? "Generating voice-over…" : voiceovers[project._id] ? "Regenerate AI voice-over" : "Generate AI voice-over"}</button>}{(voiceovers[project._id]?.url || project.voiceoverUrl) && <div className="yt-script-preview"><audio controls preload="none" src={voiceovers[project._id]?.url || project.voiceoverUrl} aria-label={"AI voice-over for "+project.title}/><a className="primary" href={voiceovers[project._id]?.url || project.voiceoverUrl} download={voiceovers[project._id]?.name || (project.title || "voiceover").replace(/[^a-z0-9-_]/gi,"_")+".mp3"}>Download MP3</a>{(voiceovers[project._id]?.stored || project.voiceoverUrl) && <small>Stored audio</small>}</div>}{project.captions && <details className="yt-script-preview"><summary>Review / download SRT</summary><textarea rows="8" readOnly value={project.captions} aria-label={"SRT captions for "+project.title}/><a className="primary" download={(project.title || "video").replace(/[^a-z0-9-_]/gi,"_")+".srt"} href={"data:text/plain;charset=utf-8,"+encodeURIComponent(project.captions)}>Download .srt</a></details>}{project.script && <button type="button" className="primary" onClick={()=>downloadRenderPackage(project)}>Export render package</button>}{project.script && <button type="button" className="primary" disabled={renderingId === project._id || ["queued","running"].includes(project.renderStatus)} onClick={()=>queueRender(project._id)}>{renderingId === project._id ? "Queueing render…" : project.renderStatus === "completed" ? "Render again" : "Queue MP4 render"}</button>}{project.renderStatus && project.renderStatus !== "idle" && <div className="yt-script-preview"><b>Render status: {project.renderStatus}</b>{project.renderError && <p role="status">{project.renderError}</p>}{project.renderStatus === "completed" && project.renderOutputUrl && <p><a className="primary" href={project.renderOutputUrl} target="_blank" rel="noreferrer">Open rendered MP4</a></p>}</div>}{project.storyboard && <details className="yt-script-preview"><summary>Scene media references</summary><p><small>Paste a JSON array of licensed media URLs, one object per scene. This stores references only; it does not upload files.</small></p><textarea rows="8" value={assetEdits[project._id] ?? JSON.stringify(project.sceneAssets || [], null, 2)} onChange={e=>setAssetEdits(prev=>({...prev,[project._id]:e.target.value}))} aria-label={"Scene media references for "+project.title} placeholder={'[{"scene":1,"type":"video","url":"https://...","duration":5,"attribution":"Source/license"}]'}/><button type="button" className="primary" disabled={savingAssetsId === project._id} onClick={()=>saveSceneAssets(project)}>{savingAssetsId === project._id ? "Saving media references…" : "Save scene media references"}</button></details>}{project.storyboard && <details className="yt-script-preview"><summary>Render readiness checklist</summary><div className="yt-readiness"><p><b>{getRenderReadiness(project).ready ? "Ready for renderer setup" : "Preparation progress"}</b></p>{getRenderReadiness(project).checks.map(check=><div key={check.label} className="yt-readiness-row"><span>{check.done ? "✓" : "○"} {check.label}</span><small>{check.done ? "Available" : "Missing / not added"}</small></div>)}<p><small>Scene media is not uploaded yet. A complete checklist does not itself render an MP4.</small></p></div></details>}{project.script && <details className="yt-script-preview"><summary>Edit / review script</summary><textarea rows="10" value={scriptEdits[project._id] ?? project.script} onChange={e=>setScriptEdits(prev=>({...prev,[project._id]:e.target.value}))} aria-label={"Edit script for "+project.title}/><button type="button" className="primary" disabled={savingScriptId === project._id || (scriptEdits[project._id] ?? project.script) === project.script} onClick={()=>saveScript(project)}>{savingScriptId === project._id ? "Saving…" : "Save script edits"}</button></details>}</div><span className="yt-draft-badge">{project.status}</span><button type="button" className="primary" disabled={generatingId === project._id} onClick={()=>generateScript(project._id)}>{generatingId === project._id ? "Generating…" : project.script ? "Regenerate script" : "Generate AI script"}</button><button type="button" className="yt-remove" onClick={()=>removeProject(project._id)} aria-label="Remove project">×</button>
      </article>)}
    </div>
  </section>;
}
