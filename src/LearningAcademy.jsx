import React, { useCallback, useEffect, useState } from "react";

const API_BASE=(import.meta.env.VITE_API_URL||"https://shivasha.onrender.com").replace(/\/$/,"");
const CATEGORIES=["technology","business","marketing","finance","education","spirituality","wellness","other"];
const money=(amount,currency="INR")=>new Intl.NumberFormat("en-IN",{style:"currency",currency}).format(Number(amount||0));

export default function LearningAcademy({auth}) {
  const [courses,setCourses]=useState([]);
  const [mine,setMine]=useState({created:[],enrolled:[]});
  const [pending,setPending]=useState([]);
  const [earnings,setEarnings]=useState({totals:[],sales:[]});
  const [unallocated,setUnallocated]=useState([]);
  const [saleForm,setSaleForm]=useState({enrollmentId:"",instructorRatePercent:"",affiliateCode:"",affiliateRatePercent:"0"});
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
    try{const [catalog,own,earningData]=await Promise.all([request("/api/learning/courses"),request("/api/learning/my-courses"),request("/api/learning/instructor/earnings")]);setCourses(catalog.courses||[]);setMine(own);setEarnings(earningData);if(auth?.user?.role==="admin"){const [review,waiting]=await Promise.all([request("/api/learning/admin/courses"),request("/api/learning/admin/pending-paid-enrollments")]);setPending(review.courses||[]);setUnallocated(waiting.enrollments||[]);}else{setPending([]);setUnallocated([]);}}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[request,auth?.user?.role]);
  useEffect(()=>{if(auth?.token)refresh();},[auth?.token,refresh]);
  const createCourse=async e=>{
    e.preventDefault();setBusy(true);setError("");setNotice("");
    const lessons=form.lessons.split("\n").map(x=>x.trim()).filter(Boolean).map(line=>{const [title,...url]=line.split("|");return {title:title.trim(),videoUrl:url.join("|").trim(),durationMinutes:0};});
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
      <label>Lesson titles (one per line; optional video URL after |)<textarea required value={form.lessons} onChange={e=>setForm({...form,lessons:e.target.value})}/><small className="muted">Example: Introduction | https://your-authorized-video-link</small></label>
      <div style={{display:"flex",gap:8}}><button className="primary" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button><button type="button" className="secondary" onClick={()=>setShowCreate(false)}>Cancel</button></div>
    </form>}
    <div className="panel" style={{padding:16,marginBottom:18}}><h3>Instructor earnings</h3><p className="muted">Only admin-verified paid course sales are included. Earnings shown here are ledger balances, not money paid out.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>{earnings.totals.map(x=><div key={x.currency} className="panel" style={{padding:12}}><b>{x.currency}</b><p>Sales: {x.sales}</p><h3>{new Intl.NumberFormat("en-IN",{style:"currency",currency:x.currency}).format(x.earned)}</h3><small className="muted">Gross sales: {new Intl.NumberFormat("en-IN",{style:"currency",currency:x.currency}).format(x.gross)}</small></div>)}{!earnings.totals.length&&<p className="muted">No verified course earnings yet.</p>}</div>{earnings.sales.length>0&&<div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%"}}><thead><tr><th align="left">Date</th><th align="left">Course</th><th align="right">Gross</th><th align="right">Instructor share</th><th align="left">Status</th></tr></thead><tbody>{earnings.sales.map(s=><tr key={s._id}><td>{new Date(s.createdAt).toLocaleDateString()}</td><td>{s.course?.title||"Course"}</td><td align="right">{s.currency} {s.grossAmount}</td><td align="right">{s.currency} {s.instructorAmount}</td><td>{s.status}</td></tr>)}</tbody></table></div>}</div>
    {auth?.user?.role==="admin"&&<div className="panel" style={{padding:16,marginBottom:18}}><h3>Admin · Course review queue</h3>{pending.length?pending.map(course=><div key={course._id} style={{padding:"10px 0",borderBottom:"1px solid #e5e7eb"}}><b>{course.title}</b><p className="muted">Instructor: {course.instructor?.name||"Unknown"} · {money(course.price,course.currency)}</p><div style={{display:"flex",gap:8}}><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await request("/api/learning/courses/"+course._id+"/review",{method:"PATCH",body:JSON.stringify({status:"published"})});setNotice("Course published.");await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Publish</button><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await request("/api/learning/courses/"+course._id+"/review",{method:"PATCH",body:JSON.stringify({status:"rejected",reviewNote:"Please revise and resubmit."})});setNotice("Course returned to instructor.");await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Reject</button></div></div>):<p className="muted">No courses waiting for review.</p>}</div>}
    {auth?.user?.role==="admin"&&<div className="panel" style={{padding:16,marginBottom:18}}><h3>Admin · Verify course sale & allocate earnings</h3><p className="muted">Only select payments already verified by an administrator. Set rates only according to the written instructor/affiliate agreement. Shares are percentages of the verified sale and cannot exceed 100%.</p><label>Verified enrollment<select value={saleForm.enrollmentId} onChange={e=>setSaleForm({...saleForm,enrollmentId:e.target.value})}><option value="">Select a paid enrollment</option>{unallocated.map(e=><option key={e._id} value={e._id}>{e.course?.title} · {e.student?.name||e.student?.email} · {e.course?.currency} {e.amountPaid||e.course?.price}</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:10}}><label>Instructor share %<input required type="number" min="0" max="100" step="0.01" value={saleForm.instructorRatePercent} onChange={e=>setSaleForm({...saleForm,instructorRatePercent:e.target.value})}/></label><label>Affiliate code (optional)<input value={saleForm.affiliateCode} onChange={e=>setSaleForm({...saleForm,affiliateCode:e.target.value.toUpperCase()})}/></label><label>Affiliate share %<input type="number" min="0" max="50" step="0.01" value={saleForm.affiliateRatePercent} onChange={e=>setSaleForm({...saleForm,affiliateRatePercent:e.target.value})}/></label></div><button className="primary" disabled={busy||!saleForm.enrollmentId||!saleForm.instructorRatePercent.trim()} onClick={async()=>{setBusy(true);setError("");setNotice("");try{const d=await request("/api/learning/admin/sales/verify",{method:"POST",body:JSON.stringify({...saleForm,instructorRatePercent:Number(saleForm.instructorRatePercent),affiliateRatePercent:Number(saleForm.affiliateRatePercent)})});setNotice(d.message);setSaleForm({...saleForm,enrollmentId:""});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}}>Verify & record sale split</button><p className="muted">Platform share is the remaining balance. Affiliate commission, when used, enters the existing pending-review commission ledger. No payout is triggered.</p></div>}
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
