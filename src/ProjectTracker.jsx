import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const starterTasks = [
  { id:"portfolio-live", project:"Portfolio Website", title:"Verify latest GitHub Pages deployment", status:"pending", priority:"high" },
  { id:"portfolio-demo", project:"Portfolio Website", title:"Add verified demo links and project screenshots", status:"pending", priority:"medium" },
  { id:"global-leads", project:"Global Projects & Leads", title:"Complete international projects and leads module", status:"in-progress", priority:"high" },
  { id:"global-tests", project:"Global Projects & Leads", title:"Finish integration tests and verify lead workflows", status:"pending", priority:"high" },
  { id:"prompt-rollout", project:"AI Prompt Library", title:"Complete production rollout", status:"pending", priority:"high" },
  { id:"prompt-seed", project:"AI Prompt Library", title:"Seed categories and starter prompts", status:"pending", priority:"high" },
  { id:"prompt-provider", project:"AI Prompt Library", title:"Configure AI provider and test prompt generation", status:"pending", priority:"high" },
  { id:"docker", project:"Self-Hosted Server", title:"Install Docker Engine and Docker Compose in Ubuntu WSL", status:"in-progress", priority:"high" },
  { id:"backend", project:"Self-Hosted Server", title:"Run Shivasha backend on the self-hosted server", status:"pending", priority:"high" },
  { id:"mongodb", project:"Self-Hosted Server", title:"Connect backend to MongoDB and verify persistence", status:"pending", priority:"high" },
  { id:"ktl-daily", project:"KTL Daily Tasks", title:"Verify deployment and complete remaining fixes", status:"pending", priority:"medium" },
  { id:"ktl-crm", project:"KTL PVT LTD CRM & MIS", title:"Verify CRM, MIS and export workflows", status:"pending", priority:"medium" },
  { id:"pooja", project:"Shivasha Modules", title:"Complete Pooja Book and daily tithi / vrat features", status:"pending", priority:"medium" },
  { id:"money", project:"Shivasha Modules", title:"Complete Money Management module", status:"pending", priority:"medium" },
  { id:"playstore", project:"Shivasha Release", title:"Prepare privacy, data safety and Play Store readiness", status:"pending", priority:"medium" }
];

const statusLabel = { "pending":"Pending", "in-progress":"In Progress", "completed":"Completed" };
const button = { border:0, borderRadius:9, padding:"9px 12px", cursor:"pointer", fontWeight:700 };
const card = { background:"#fff", border:"1px solid #e5eaf1", borderRadius:15, padding:16, boxShadow:"0 4px 16px rgba(15,23,42,.04)" };

export default function ProjectTracker({ auth }) {
  const [tasks,setTasks] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [filter,setFilter] = useState("all");
  const [draft,setDraft] = useState({ project:"Shivasha", title:"", priority:"medium" });
  const [github,setGithub] = useState(null);
  const [githubLoading,setGithubLoading] = useState(false);
  const [githubError,setGithubError] = useState("");

  const loadGitHub = async (refresh = false) => {
    setGithubLoading(true); setGithubError("");
    try {
      const response = await fetch(API_BASE+"/api/admin/github-projects"+(refresh?"?refresh=1":""), { headers:{ Authorization:"Bearer "+(auth?.token || "") } });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.message || "Unable to sync GitHub projects");
      setGithub(data);
    } catch (e) { setGithubError(e.message); }
    finally { setGithubLoading(false); }
  };

  useEffect(() => { if (auth?.token) loadGitHub(); }, [auth?.token]);

  const headers = { "Content-Type":"application/json", Authorization:"Bearer "+(auth?.token || "") };
  const persist = async next => {
    setSaving(true); setError("");
    try {
      const response = await fetch(API_BASE+"/api/admin/project-tracker", { method:"PUT", headers, body:JSON.stringify({ tasks:next }) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.message || "Unable to save project tracker");
      setTasks(data.tasks || next);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(API_BASE+"/api/admin/project-tracker", { headers:{ Authorization:"Bearer "+(auth?.token || "") } })
      .then(async response => {
        const data = await response.json().catch(()=>({}));
        if (!response.ok) throw new Error(data.message || "Unable to load your project tracker");
        if (!cancelled) {
          const initialTasks = data.initialized ? (Array.isArray(data.tasks) ? data.tasks : []) : starterTasks;
          setTasks(initialTasks);
          if (!data.initialized) {
            const seedResponse = await fetch(API_BASE+"/api/admin/project-tracker", { method:"PUT", headers:{ "Content-Type":"application/json", Authorization:"Bearer "+(auth?.token || "") }, body:JSON.stringify({ tasks:initialTasks }) });
            if (!seedResponse.ok) throw new Error("Unable to initialize your private project tracker");
          }
        }
      })
      .catch(e => { if (!cancelled) { setError(e.message); setTasks(starterTasks); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth?.token]);

  const counts = useMemo(() => ({
    total:tasks.length,
    completed:tasks.filter(t=>t.status==="completed").length,
    progress:tasks.filter(t=>t.status==="in-progress").length,
    pending:tasks.filter(t=>t.status==="pending").length
  }),[tasks]);
  const visible = tasks.filter(t => filter==="all" || t.status===filter);
  const update = (id, patch) => persist(tasks.map(t=>t.id===id?{...t,...patch}:t));
  const add = e => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const task = { id:"task-"+Date.now(), project:draft.project.trim() || "Shivasha", title:draft.title.trim(), status:"pending", priority:draft.priority };
    setDraft({ project:"Shivasha", title:"", priority:"medium" });
    persist([task,...tasks]);
  };
  const remove = id => persist(tasks.filter(t=>t.id!==id));

  return <section className="content">
    <div className="feed-head"><div><h2>My Project Dashboard</h2><p>Private workspace · Only your signed-in admin account can access these tasks.</p></div><span style={{fontSize:12,color:"#64748b"}}>{saving?"Saving…":"Cloud-saved"}</span></div>
    {error && <div className="api-error" role="alert">{error}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:12,marginBottom:18}}>
      {[["Total Tasks",counts.total],["Completed",counts.completed],["In Progress",counts.progress],["Pending",counts.pending]].map(([label,value])=><div key={label} style={card}><small style={{color:"#64748b"}}>{label}</small><div style={{fontSize:27,fontWeight:800,marginTop:5}}>{value}</div></div>)}
    </div>
    <div style={{...card,marginBottom:18}}>
      <div className="feed-head" style={{alignItems:"center"}}>
        <div><h3 style={{margin:"0 0 4px"}}>GitHub Projects Sync</h3><p style={{margin:0,color:"#64748b",fontSize:13}}>Repositories, open Issues, Pull Requests and latest Actions status.</p></div>
        <button onClick={()=>loadGitHub(true)} disabled={githubLoading} style={{...button,background:"#111827",color:"#fff"}}>{githubLoading?"Syncing…":"↻ Sync GitHub"}</button>
      </div>
      {githubError && <div className="api-error" role="alert">{githubError}</div>}
      {githubLoading && !github && <p>Loading GitHub repository status…</p>}
      {github && <>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"14px 0"}}>
          {[["Repositories",github.repositoryCount],["Open Issues",github.totals.openIssues],["Open PRs",github.totals.openPullRequests],["Workflow failures",github.totals.workflowFailures],["Running workflows",github.totals.workflowsRunning]].map(([label,value])=><div key={label} style={{background:"#f8fafc",borderRadius:10,padding:10,minWidth:105}}><small style={{color:"#64748b"}}>{label}</small><div style={{fontSize:22,fontWeight:800}}>{value}</div></div>)}
        </div>
        <small style={{color:"#64748b"}}>Last synced: {new Date(github.syncedAt).toLocaleString()}</small>
        <div style={{display:"grid",gap:10,marginTop:12}}>
          {github.projects.map(project=><article key={project.id} style={{border:"1px solid #e5eaf1",borderRadius:11,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <a href={project.url} target="_blank" rel="noreferrer" style={{fontWeight:800,color:"#3730a3"}}>{project.fullName}</a>
              <small style={{color:"#64748b"}}>{project.visibility} · Updated {new Date(project.updatedAt).toLocaleDateString()}</small>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:13,marginTop:7}}>
              <span>Issues: {project.issues.length}{project.issues.length===10?" (latest 10)":""}</span>
              <span>Open PRs: {project.pullRequests.length}</span>
              <span>Actions: {project.workflow ? (project.workflow.status==="completed" ? (project.workflow.conclusion||"completed") : project.workflow.status) : "No recent run"}</span>
            </div>
            {project.issues.length>0 && <div style={{marginTop:8,fontSize:13}}><b>Issues:</b> {project.issues.slice(0,3).map((item,index)=><React.Fragment key={item.number}>{index>0?" · ":""}<a href={item.url} target="_blank" rel="noreferrer">#{item.number} {item.title}</a></React.Fragment>)}</div>}
            {project.pullRequests.length>0 && <div style={{marginTop:6,fontSize:13}}><b>Pull Requests:</b> {project.pullRequests.slice(0,3).map((item,index)=><React.Fragment key={item.number}>{index>0?" · ":""}<a href={item.url} target="_blank" rel="noreferrer">#{item.number} {item.title}</a></React.Fragment>)}</div>}
            {project.workflow?.url && <div style={{marginTop:6,fontSize:13}}><a href={project.workflow.url} target="_blank" rel="noreferrer">Open latest GitHub Actions run</a></div>}
            {project.syncWarning && <small style={{display:"block",color:"#b45309",marginTop:5}}>{project.syncWarning}</small>}
          </article>)}
        </div>
      </>}
    </div>
    <div style={{...card,marginBottom:18}}>
      <h3 style={{marginTop:0}}>Add a task</h3>
      <form onSubmit={add} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        <input aria-label="Project name" value={draft.project} onChange={e=>setDraft({...draft,project:e.target.value})} placeholder="Project name" style={{padding:11,border:"1px solid #dbe2ea",borderRadius:9,minWidth:0}}/>
        <input aria-label="Task title" required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="What needs to be done?" style={{padding:11,border:"1px solid #dbe2ea",borderRadius:9,minWidth:0}}/>
        <select aria-label="Task priority" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})} style={{padding:11,border:"1px solid #dbe2ea",borderRadius:9}}><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select>
        <button style={{...button,background:"#4f46e5",color:"#fff"}} disabled={saving}>+ Add Task</button>
      </form>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
      {[["all","All"],["pending","Pending"],["in-progress","In Progress"],["completed","Completed"]].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} style={{...button,background:filter===value?"#312e81":"#eef2ff",color:filter===value?"#fff":"#3730a3"}}>{label}</button>)}
    </div>
    {loading ? <div className="panel empty">Loading your private project tracker…</div> : visible.length ? <div style={{display:"grid",gap:10}}>
      {visible.map(task=><article key={task.id} style={{...card,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:700}}>{task.project} · {(task.priority||"medium").toUpperCase()} PRIORITY</div>
          <div style={{fontWeight:750,marginTop:5,overflowWrap:"anywhere",textDecoration:task.status==="completed"?"line-through":"none"}}>{task.title}</div>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <select aria-label={"Status for "+task.title} value={task.status} onChange={e=>update(task.id,{status:e.target.value})} style={{padding:9,border:"1px solid #dbe2ea",borderRadius:9,maxWidth:130}}>{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          <button aria-label={"Delete "+task.title} onClick={()=>remove(task.id)} style={{...button,background:"#fee2e2",color:"#991b1b"}}>Delete</button>
        </div>
      </article>)}
    </div> : <div className="panel empty">No tasks in this filter.</div>}
    <p style={{fontSize:12,color:"#64748b",marginTop:14}}>Your task list is stored against your own account on the Shivasha server. Other users cannot read or change it.</p>
  </section>;
}
