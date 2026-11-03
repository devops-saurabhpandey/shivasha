import React, { useEffect, useState } from "react";
import "./cinematic-studio.css";

const API_BASE = import.meta.env.VITE_API_URL || "https://shivasha.onrender.com";
function readToken(auth) { return typeof auth === "string" ? auth : auth?.token || auth?.accessToken || auth?.user?.token || ""; }

const looks = [
  { id: "cinematic", name: "Cinematic", detail: "Film contrast · rich tones" },
  { id: "natural", name: "Natural", detail: "Soft, realistic enhancement" },
  { id: "social", name: "Social", detail: "Bright, punchy social look" },
  { id: "custom", name: "Custom", detail: "Tune your own style" }
];

export default function CinematicVideoStudio({ auth }) {
  const [video, setVideo] = useState(null);
  const [look, setLook] = useState("cinematic");
  const [intensity, setIntensity] = useState(65);
  const [background, setBackground] = useState("original");
  const [audio, setAudio] = useState("original");
  const [status, setStatus] = useState("");
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [capabilities, setCapabilities] = useState(null);
  const [capabilityError, setCapabilityError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/cinematic-video/capabilities`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not read studio capabilities");
        if (active) setCapabilities(data);
      })
      .catch(error => { if (active) setCapabilityError(error.message || "Studio status unavailable"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!job?.id || !["queued", "processing"].includes(job.status)) return undefined;
    const token = readToken(auth);
    if (!token) return undefined;
    let active = true;
    const refreshJob = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/cinematic-video/jobs/${job.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && active && data.job) setJob(data.job);
      } catch {
        // Keep the last known job state; the manual refresh button remains available.
      }
    };
    const timer = window.setInterval(refreshJob, 5000);
    refreshJob();
    return () => { active = false; window.clearInterval(timer); };
  }, [job?.id, job?.status, auth]);

  return <section className="content cinematic-studio">
    <header className="cinematic-hero">
      <span className="cinematic-kicker">SHIVASHA CREATIVE AI · VIDEO</span>
      <h2>Make every moment <em>cinematic.</em></h2>
      <p>Import a clip and choose a cinematic look. Create a render job and follow its processing status.</p>
      <span className="cinematic-pill">✦ CINEMATIC MODE · DEFAULT</span>
    </header>
    <div className="cinematic-job" aria-live="polite">
      <b>Studio service status</b>
      {capabilities ? <>
        <span>Job API: {capabilities.jobApi ? "Available" : "Unavailable"} · Upload storage: {capabilities.features?.upload ? "Configured" : "Not configured"} · Worker token: {capabilities.workerConfigured ? "Configured" : "Not configured"}</span>
        <small>AI rendering: {capabilities.aiRendering ? "Available" : "Not active"} · Editor: {capabilities.editor || "Unknown"}</small>
      </> : <small>{capabilityError || "Checking video service…"}</small>}
    </div>
    <div className="cinematic-workspace">
      <div className="cinematic-preview">
        {video ? <video src={URL.createObjectURL(video)} controls playsInline /> :
          <div className="cinematic-placeholder"><span>▶</span><strong>Your cinematic preview</strong><small>Choose a video to preview it here</small></div>}
        <label className="cinematic-upload">＋ Import video<input type="file" accept="video/*" onChange={e => { setVideo(e.target.files?.[0] || null); setStatus(""); }} /></label>
      </div>
      <div className="cinematic-controls">
        <h3>Film look</h3>
        <div className="cinematic-look-grid">{looks.map(item => <button type="button" key={item.id} className={look === item.id ? "active" : ""} onClick={() => setLook(item.id)}><b>{item.name}</b><small>{item.detail}</small></button>)}</div>
        <label className="cinematic-range">Look intensity <b>{intensity}%</b><input type="range" min="0" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))}/></label>
        <label className="cinematic-select">Background
          <select value={background} onChange={e => setBackground(e.target.value)}><option value="original">Keep original</option><option value="blur">Cinematic depth blur</option><option value="studio">Studio backdrop (AI processing planned)</option><option value="custom">Custom background (AI processing planned)</option></select>
        </label>
        <label className="cinematic-select">Audio
          <select value={audio} onChange={e => setAudio(e.target.value)}><option value="original">Keep original audio</option><option value="enhance">Voice enhancement (AI processing planned)</option><option value="score">Add cinematic score (planned)</option></select>
        </label>
        <button className="cinematic-render" type="button" disabled={busy} onClick={async () => { if (!video) { setStatus("Import a video first."); return; } const token = readToken(auth); if (!token) { setStatus("Please sign in again to create a video job."); return; } setBusy(true); setStatus(""); setUploadProgress(""); try { setUploadProgress("Uploading source video…"); const form = new FormData(); form.append("video", video); const uploadResponse = await fetch(`${API_BASE}/api/cinematic-video/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); const uploadData = await uploadResponse.json(); if (!uploadResponse.ok) throw new Error(uploadData.message || "Video upload failed"); setUploadProgress("Creating job…"); const response = await fetch(`${API_BASE}/api/cinematic-video/jobs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sourceUrl: uploadData.sourceUrl, settings: { look, intensity, background, audio } }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not create job"); setJob(data.job); setStatus(data.message || "Job created."); } catch (error) { setStatus(error.message || "API unavailable. Check server deployment."); } finally { setBusy(false); } }}>{busy ? (uploadProgress || "Working…") : "✦ Upload & create cinematic job"}</button>
        {job && <div className="cinematic-job">
          <b>Job: {job.id}</b><span>Status: {job.status} · {job.progress}%</span>
          {job.status === "completed" && job.outputUrl && <a href={job.outputUrl} target="_blank" rel="noreferrer">Open rendered video</a>}
          {job.status === "failed" && job.error && <small role="alert">Render failed: {job.error}</small>}
          <button type="button" disabled={busy} onClick={async () => { const token = readToken(auth); if (!token) { setStatus("Please sign in again to check this job."); return; } setBusy(true); try { const response = await fetch(`${API_BASE}/api/cinematic-video/jobs/${job.id}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not refresh job"); setJob(data.job); setStatus("Job status refreshed."); } catch (error) { setStatus(error.message || "Could not refresh job."); } finally { setBusy(false); } }}>↻ Refresh status</button>
          <small>{capabilities?.workerConfigured ? "Worker token is configured; processing still requires the worker process to be running." : "Rendering worker is not connected yet; refresh checks the saved job status."}</small>
        </div>}
        {status && <p className="cinematic-status" role="status">{status}</p>}
      </div>
    </div>
    <div className="cinematic-feature-row"><span>🎨 FFmpeg film color grading · worker required</span><span>🌄 AI background replacement · planned</span><span>✂️ Smart cuts · planned</span><span>🎧 Audio tools · planned</span><span>💇 Hairstyle effects · planned</span><span>📽️ 1080p / 4K export · backend dependent</span></div>
    <p className="cinematic-note">FFmpeg color grading is implemented in the worker script but runs only after the worker is installed and started. AI background replacement, hairstyle effects, advanced audio processing and 1080p/4K export profiles are not active yet.</p>
  </section>;
}
