import React, { useCallback, useEffect, useState } from "react";

const API_BASE=(import.meta.env.VITE_API_URL||"https://shivasha.onrender.com").replace(/\/$/,"");
const CATEGORIES=["technology","business","marketing","finance","education","spirituality","wellness","other"];
const money=(amount,currency="INR")=>new Intl.NumberFormat("en-IN",{style:"currency",currency}).format(Number(amount||0));

export default function LearningAcademy({auth}) {
  const [courses,setCourses]=useState([]);
  const [mine,setMine]=useState({created:[],enrolled:[]});
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({title:"",description:"",category:"technology",language:"Hindi",level:"beginner",price:"0",currency:"INR",lessons:"परिचय"});
  const request=useCallback(async(path,options={})=>{
    const r=await fetch(API_BASE+path,{...options,headers:{"Content-Type":"application/json",...(auth?.token?{Authorization:"Bearer "+auth.token}:{}),...(options.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||"Learning Academy request failed.");
    return d;
  },[auth?.token]);
  const refresh=useCallback(async()=>{
    setLoading(true);setError("");
    try{const [catalog,own]=await Promise.all([request("/api/learning/courses"),request("/api/learning/my-courses")]);setCourses(catalog.courses||[]);setMine(own);}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[request]);
  useEffect(()=>{if(auth?.token)refresh();},[auth?.token,refresh]);
  const createCourse=async e=>{
    e.preventDefault();setBusy(true);setError("");setNotice("");
    const lessons=form.lessons.split("\n").map(x=>x.trim()).filter(Boolean).map(title=>({title,durationMinutes:0}));
    try{await request("/api/learning/courses",{method:"POST",body:JSON.stringify({...form,price:Number(form.price),lessons})});setNotice("Course submitted. It will appear in the catalogue after admin review.");setShowCreate(false);setForm({...form,title:"",description:"",lessons:"परिचय"});await refresh();}
    catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const openCourse=async id=>{setError("");setNotice("");try{const d=await request("/api/learning/courses/"+id);setSelected(d);}catch(e){setError(e.message);}};
  const enroll=async()=>{
    if(!selected?.course)return;setBusy(true);setError("");setNotice("");
    try{const d=await request("/api/learning/courses/"+selected.course._id+"/enroll",{method:"POST",body:"{}"});setNotice(d.message);await openCourse(selected.course._id);await refresh();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const completeLesson=async lessonId=>{
    if(!selected?.enrollment?._id)return;setBusy(true);setError("");setNotice("");
    try{const d=await request("/api/learning/enrollments/"+selected.enrollment._id+"/progress",{method:"POST",body:JSON.stringify({lessonId})});setNotice(d.certificateId?"Course completed! Your certificate ID is "+d.certificateId:"Lesson progress saved.");await openCourse(selected.course._id);await refresh();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const enrolledIds=new Set(mine.enrolled.map(x=>String(x.course?._id)));
  return <section className="content">
    <div className="feed-head"><div><h2>SHIVASHA Learning Academy</h2><p>Discover courses, learn step by step and track your progress.</p></div><button className="primary" onClick={()=>setShowCreate(v=>!v)}>＋ Create a course</button></div>
    {error&&<div className="api-error" role="alert">{error}</div>}{notice&&<div className="panel" role="status" style={{padding:12,marginBottom:12}}>{notice}</div>}
    {showCreate&&<form className="panel" onSubmit={createCourse} style={{padding:18,display:"grid",gap:12,marginBottom:18}}>
      <h3>Instructor course submission</h3>
      <p className="muted">Courses are saved as pending review. Only approved courses appear publicly. Submit only content you own or are authorized to teach.</p>
      <label>Course title<input required maxLength="160" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Description<textarea required maxLength="5000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
        <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label>Level<select value={form.level} onChange={e=>setForm({...form,level:e.target.value})}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <label>Language<input value={form.language} maxLength="40" onChange={e=>setForm({...form,language:e.target.value})}/></label>
        <label>Price (0 = free)<input type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
      </div>
      <label>Lesson titles (one per line)<textarea required value={form.lessons} onChange={e=>setForm({...form,lessons:e.target.value})}/></label>
      <div style={{display:"flex",gap:8}}><button className="primary" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button><button type="button" className="secondary" onClick={()=>setShowCreate(false)}>Cancel</button></div>
    </form>}
    {selected&&<div className="panel" style={{padding:18,marginBottom:18}}>
      <button className="secondary" onClick={()=>setSelected(null)}>← Back to courses</button>
      <h2>{selected.course.title}</h2><p>{selected.course.description}</p>
      <p className="muted">{selected.course.category} · {selected.course.level} · {selected.course.language} · {money(selected.course.price,selected.course.currency)}</p>
      {!selected.enrollment&&selected.course.price===0&&<button className="primary" disabled={busy} onClick={enroll}>Enroll free</button>}
      {!selected.enrollment&&selected.course.price>0&&<p className="muted">Paid checkout is not connected yet. Enrolment will be enabled after secure payment integration.</p>}
      {selected.enrollment&&<p><b>Progress:</b> {selected.enrollment.progress?.length||0} / {selected.course.lessons.length} lessons</p>}
      <div style={{display:"grid",gap:8,marginTop:12}}>{selected.course.lessons.map((lesson,i)=>{
        const done=selected.enrollment?.progress?.some(p=>String(p.lesson)===String(lesson._id));
        return <div key={lesson._id} className="panel" style={{padding:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><div><b>{i+1}. {lesson.title}</b><p className="muted">{lesson.description||"Lesson"}</p></div>{selected.enrollment&&<button className={done?"secondary":"primary"} disabled={busy||done} onClick={()=>completeLesson(lesson._id)}>{done?"Completed":"Mark complete"}</button>}</div>;
      })}</div>
      {selected.enrollment?.certificateId&&<div className="panel" style={{padding:14,marginTop:12}}><b>Certificate earned</b><p>{selected.enrollment.certificateId}</p><button className="secondary" onClick={async()=>{try{const d=await request("/api/learning/certificates/"+selected.enrollment.certificateId);setNotice("Certificate verified: "+d.certificate.course+" · "+new Date(d.certificate.completedAt).toLocaleDateString());}catch(e){setError(e.message);}}}>Verify certificate</button></div>}
    </div>}
    <div className="panel" style={{padding:16,marginBottom:16}}><h3>My learning</h3>{mine.enrolled.length?mine.enrolled.map(x=><div key={x.enrollmentId} style={{padding:"8px 0",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",gap:8}}><span>{x.course.title} · {x.progress} lessons complete</span><button className="secondary" onClick={()=>openCourse(x.course._id)}>Continue</button></div>):<p className="muted">You have not enrolled in a course yet.</p>}</div>
    <h3>Explore courses</h3>
    {loading?<p>Loading courses…</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
      {courses.map(course=><article className="panel" key={course._id} style={{padding:16}}><span className="badge">{course.category}</span><h3>{course.title}</h3><p>{course.description.slice(0,180)}</p><small className="muted">{course.language} · {course.level} · {course.lessons.length} lessons</small><h3>{money(course.price,course.currency)}</h3><button className="primary" onClick={()=>openCourse(course._id)}>{enrolledIds.has(String(course._id))?"Continue learning":"View course"}</button></article>)}
      {!courses.length&&<p className="muted">No approved courses yet. Instructors can submit courses for admin review.</p>}
    </div>}
    <h3 style={{marginTop:22}}>My instructor submissions</h3>{mine.created.length?mine.created.map(c=><div className="panel" key={c._id} style={{padding:12,marginBottom:8}}><b>{c.title}</b> · <span className="muted">{c.status}</span>{c.reviewNote&&<p>{c.reviewNote}</p>}</div>):<p className="muted">No course submissions yet.</p>}
  </section>;
}
