import React, { useEffect, useMemo, useState } from "react";
import "./house-explorer.css";
import EducationAdminPanel from "./EducationAdminPanel.jsx";

const HOUSES = [
  { purushartha: "dharma", number: 1, name: "Self & Identity", hindi: "प्रथम भाव", color: "red", symbol: "◉", purpose: "Personal identity, profiles and self-development.", modules: ["M1 · Shivasha Social"], features: ["Digital identity and profiles", "Personal branding", "Social feed and connections"], phase: "Phase 1 · Foundation" },
  { purushartha: "artha", number: 2, name: "Wealth & Finance", hindi: "द्वितीय भाव", color: "orange", symbol: "₹", purpose: "Financial tools, commerce and responsible payments.", modules: ["M4 · Marketplace", "M7 · Payments", "M12 · Business OS"], features: ["Product and service catalogues", "Invoices and finance tools", "Payment gateway integrations"], phase: "Phase 4 · Commerce" },
  { purushartha: "kaam", number: 3, name: "Skills & Communication", hindi: "तृतीय भाव", color: "yellow", symbol: "⌘", purpose: "Skills, communication and software creation.", modules: ["M9 · Developers", "M10 · Software Solutions"], features: ["Messaging and communication", "Developer APIs and SDKs", "Custom software services"], phase: "Phases 1, 5 · Foundation & Developer Platform" },
  { purushartha: "moksh", number: 4, name: "Home & Property", hindi: "चतुर्थ भाव", color: "green", symbol: "⌂", purpose: "Home, property and local needs.", modules: ["M6 · Services"], features: ["Property listings", "Home-service discovery", "Property management tools"], phase: "Phase 4 · Services" },
  { purushartha: "dharma", number: 5, name: "Education & Creativity", hindi: "पंचम भाव", color: "blue", symbol: "✦", purpose: "Learning, creative work and knowledge sharing.", modules: ["M11 · Edutech", "M14 · Creator Platform"], features: ["CBSE and ICSE curriculum discovery for Classes 1–12", "Subject-wise textbook and reference-book directory", "Courses, learning paths, quizzes and study resources", "Creator profiles and educational publishing", "Creative AI assistance"], phase: "Phase 3 · AI & Education" },
  { purushartha: "artha", number: 6, name: "Services & Wellbeing", hindi: "षष्ठ भाव", color: "purple", symbol: "✚", purpose: "Everyday services, productivity and wellbeing resources.", modules: ["M6 · Services"], features: ["Local service providers", "Customer support", "Productivity and wellbeing resources"], phase: "Phase 4 · Services" },
  { purushartha: "kaam", number: 7, name: "Business & Partnerships", hindi: "सप्तम भाव", color: "brown", symbol: "⇄", purpose: "Businesses, customers, partnerships and commerce.", modules: ["M2 · Business", "M4 · Marketplace"], features: ["Business profiles and listings", "Customer inquiries and lead management", "B2B partnerships and reviews"], phase: "Phase 2 · Business Super App" },
  { purushartha: "moksh", number: 8, name: "Research & Transformation", hindi: "अष्टम भाव", color: "black", symbol: "⌬", purpose: "Advanced AI, security, research and transformation.", modules: ["M3 · AI", "M8 · Cloud"], features: ["AI assistant and discovery", "Cloud integrations and monitoring", "Security and risk-management tools"], phase: "Phases 3, 6 · AI & Automation" },
  { purushartha: "dharma", number: 9, name: "Knowledge & Philosophy", hindi: "नवम भाव", color: "indigo", symbol: "✧", purpose: "Higher learning, philosophy, spirituality and culture.", modules: ["M11 · Edutech", "M13 · Community"], features: ["Knowledge communities", "Spiritual and philosophical discussions", "Advanced learning resources"], phase: "Phases 3, 4 · Education & Community" },
  { purushartha: "artha", number: 10, name: "Career & Profession", hindi: "दशम भाव", color: "gold", symbol: "▥", purpose: "Careers, professional growth and enterprise work.", modules: ["M5 · Jobs", "M10 · Software Solutions", "M12 · Business OS"], features: ["Jobs and freelance projects", "Professional profiles", "Business and enterprise software"], phase: "Phase 4 · Careers" },
  { purushartha: "kaam", number: 11, name: "Networks & Growth", hindi: "एकादश भाव", color: "emerald", symbol: "◎", purpose: "Networks, communities, discovery and sustainable growth.", modules: ["M13 · Community", "M15 · Enterprise", "M2 · Business"], features: ["Interest-based communities", "Business growth analytics", "Enterprise collaboration"], phase: "Phases 2, 6, 7 · Growth & Global" },
  { purushartha: "moksh", number: 12, name: "Inner Growth & Global Reach", hindi: "द्वादश भाव", color: "violet", symbol: "☼", purpose: "Reflection, global collaboration and international reach.", modules: ["M13 · Community", "M3 · AI", "M15 · Enterprise"], features: ["Meditation and reflection resources", "Multilingual global communities", "International collaboration tools"], phase: "Phase 7 · Global Expansion" }
];


const PURUSHARTHAS = [
  { id: "dharma", name: "धर्म", english: "DHARMA", tagline: "Purpose, values, learning & wisdom", description: "Self-knowledge, education, creativity, philosophy and meaningful direction.", houses: [1, 5, 9], icon: "☼", color: "dharma" },
  { id: "artha", name: "अर्थ", english: "ARTHA", tagline: "Wealth, work, services & stability", description: "Finance, services, practical resources, career and sustainable prosperity.", houses: [2, 6, 10], icon: "₹", color: "artha" },
  { id: "kaam", name: "काम", english: "KAAMA", tagline: "Skills, relationships & aspirations", description: "Communication, creativity in action, partnerships, networks and ambitions.", houses: [3, 7, 11], icon: "⇄", color: "kaam" },
  { id: "moksh", name: "मोक्ष", english: "MOKSHA", tagline: "Home, transformation & inner growth", description: "Home and inner foundations, research, reflection and spiritual growth.", houses: [4, 8, 12], icon: "✧", color: "moksh" }
];

const PHASES = [
  ["1", "Foundation", "Authentication, security, database, shared platform and 12-house navigation."],
  ["2", "Business Super App", "Business profiles, listings, search, inquiries and lead management."],
  ["3", "AI Super App", "AI assistant, natural-language search and business discovery."],
  ["4", "Marketplace & Careers", "Orders, services, jobs and carefully scoped payment integrations."],
  ["5", "Developer Platform", "Developer portal, APIs, SDKs, webhooks and sandbox."],
  ["6", "AI Agents & Business OS", "Permissioned automation, CRM, analytics and enterprise tools."],
  ["7", "Global Expansion", "Localization, international integrations, compliance and scale."]
];


const EDUCATION_SUBJECTS = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"];
const PRACTICE_QUESTIONS = [
  { subject: "Mathematics", question: "What is 12 × 8?", options: ["84", "96", "108", "88"], answer: 1, explain: "12 × 8 = 96." },
  { subject: "Science", question: "Which gas do green plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: 2, explain: "Plants absorb carbon dioxide and use light energy during photosynthesis." },
  { subject: "English", question: "Choose the correctly spelled word.", options: ["Enviroment", "Environment", "Envirnoment", "Environmant"], answer: 1, explain: "Environment is the correct spelling." },
  { subject: "Hindi", question: "‘जल’ का समानार्थी शब्द कौन-सा है?", options: ["अग्नि", "वायु", "नीर", "आकाश"], answer: 2, explain: "‘नीर’ जल का समानार्थी शब्द है।" },
  { subject: "Social Science", question: "Which document is the supreme law of India?", options: ["The Constitution", "A school textbook", "A newspaper", "A census report"], answer: 0, explain: "The Constitution of India is the supreme law of the country." },
  { subject: "Computer Science", question: "What does CPU commonly stand for?", options: ["Computer Power Utility", "Central Processing Unit", "Core Program Upload", "Central Print Unit"], answer: 1, explain: "CPU stands for Central Processing Unit." }
];

function EducationQuizApi({auth,apiBase,board,grade,subject}) {
 const [items,setItems]=useState([]),[picked,setPicked]=useState({}),[result,setResult]=useState(null),[history,setHistory]=useState([]),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[dailyGoal,setDailyGoal]=useState(10),[completedPlan,setCompletedPlan]=useState({});
 useEffect(()=>{
  if(!auth?.token||!apiBase)return;
  const controller=new AbortController();
  const params=new URLSearchParams({board,grade:String(Number(String(grade).replace("Class ",""))),subject});
  setLoading(true);setItems([]);setPicked({});setResult(null);
  fetch(apiBase+"/api/education/quiz/questions?"+params,{headers:{Authorization:"Bearer "+auth.token},signal:controller.signal})
   .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Quiz load failed");return d;})
   .then(d=>{setItems(d.questions||[]);setMessage(d.questions?.length?"":"No reviewed questions published for this selection yet.");})
   .catch(e=>{if(e.name!=="AbortError")setMessage(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[auth?.token,apiBase,board,grade,subject]);
 const loadHistory=async()=>{
  if(!auth?.token||!apiBase)return;
  try{const r=await fetch(apiBase+"/api/education/quiz/attempts/me",{headers:{Authorization:"Bearer "+auth.token}});const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load test history");setHistory(d.attempts||[]);}
  catch(e){setMessage(e.message);}
 };
 useEffect(()=>{loadHistory();},[auth?.token,apiBase]);
 const goalKey="shivasha-edutech-daily-goal-"+board+"-"+grade+"-"+subject;
 useEffect(()=>{try{const saved=Number(window.localStorage.getItem(goalKey));setDailyGoal([5,10,15,20].includes(saved)?saved:10);}catch{setDailyGoal(10);}},[goalKey]);
 const saveDailyGoal=value=>{setDailyGoal(value);try{window.localStorage.setItem(goalKey,String(value));}catch{setMessage("Goal applies for this session; browser storage is unavailable.");}};
 const todayKey=new Date().toLocaleDateString();
 const todayAttempts=history.filter(a=>new Date(a.createdAt).toLocaleDateString()===todayKey&&a.board===board&&Number(a.grade)===Number(String(grade).replace("Class ",""))&&a.subject===subject);
 const todayAnswered=todayAttempts.reduce((sum,a)=>sum+Number(a.totalQuestions||0),0);
 const dailyPercent=Math.min(100,Math.round(todayAnswered/dailyGoal*100));
 const planKey="shivasha-edutech-plan-"+new Date().toLocaleDateString()+"-"+board+"-"+grade+"-"+subject;
 const studyPlan=(()=>{const attempts=history.filter(a=>a.board===board&&Number(a.grade)===Number(String(grade).replace("Class ",""))&&a.subject===subject);const chapters={};attempts.forEach(a=>(a.answers||[]).forEach(answer=>{const name=answer.chapter||"Uncategorized";if(!chapters[name])chapters[name]={total:0,correct:0};chapters[name].total++;if(answer.correct)chapters[name].correct++;}));const weak=Object.entries(chapters).map(([name,v])=>({name,score:Math.round(v.correct/v.total*100)})).sort((a,b)=>a.score-b.score).filter(x=>x.score<80);const tasks=[];if(weak.length)tasks.push({id:"revise",title:"Revise "+weak[0].name,detail:"Recent accuracy: "+weak[0].score+"%. Review notes and examples."});else tasks.push({id:"revise",title:"Revise today’s lesson",detail:"Review key definitions, formulas, and examples for "+subject+"."});tasks.push({id:"practice",title:"Solve "+Math.min(5,dailyGoal)+" practice questions",detail:"Use the published question bank and submit a test to record progress."});tasks.push({id:"review",title:"Review mistakes and explanations",detail:"Revisit incorrect answers and retry them after revision."});return tasks;})();
 useEffect(()=>{try{const saved=JSON.parse(window.localStorage.getItem(planKey)||"{}");setCompletedPlan(saved&&typeof saved==="object"?saved:{});}catch{setCompletedPlan({});}},[planKey]);
 const togglePlanTask=id=>setCompletedPlan(previous=>{const next={...previous,[id]:!previous[id]};try{window.localStorage.setItem(planKey,JSON.stringify(next));}catch{}return next;});
 const submit=async()=>{
  setMessage("");
  const answers=items.filter(q=>Number.isInteger(picked[q._id])).map(q=>({questionId:q._id,selectedIndex:picked[q._id]}));
  if(!answers.length){setMessage("Please answer at least one question.");return;}
  try{
   const r=await fetch(apiBase+"/api/education/quiz/attempts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.token},body:JSON.stringify({board,grade:Number(String(grade).replace("Class ","")),subject,answers})});
   const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not save test");setResult(d.attempt);await loadHistory();
  }catch(e){setMessage(e.message);}
 };
 return <section className="education-practice education-api-quiz" aria-labelledby="education-live-quiz-title">
  <div className="education-resource-heading"><span className="house-kicker">SHIVASHA EDUTECH · QUESTION BANK</span><h3 id="education-live-quiz-title">Board-aligned practice test</h3><p>Questions here appear only after an administrator reviews and publishes them. Select board, class and subject above to filter the bank.</p></div>
  {loading&&<p role="status">Loading published questions…</p>}
  {!loading&&message&&<p className="education-catalogue-empty" role="status">{message}</p>}
  {items.map((q,i)=>{const reviewed=result?.answers?.find(a=>a.questionId===q._id);return <article className="education-question-card" key={q._id}><small>Question {i+1} · {q.chapter}</small><h4>{q.question}</h4><div className="education-answer-options">{q.options.map((option,n)=><button key={n} type="button" className={picked[q._id]===n?"selected":""} disabled={Boolean(result)} onClick={()=>setPicked(p=>({...p,[q._id]:n}))}>{String.fromCharCode(65+n)}. {option}</button>)}</div>{result&&reviewed&&<p className={"education-answer-feedback "+(reviewed.correct?"correct":"incorrect")} role="status">{reviewed.correct?"Correct answer":"Review this answer"}{q.explanation?" · "+q.explanation:""}</p>}</article>})}
  {items.length>0&&!result&&<button type="button" className="primary" onClick={submit}>Submit test & save result</button>}
  {result&&<><div className="education-answer-feedback correct" role="status">Test saved: {result.correctCount}/{result.totalQuestions} correct · Score {result.scorePercent}%</div>{result.answers?.some(a=>!a.correct)&&<button type="button" className="secondary" onClick={()=>{const wrongIds=new Set(result.answers.filter(a=>!a.correct).map(a=>a.questionId));const wrongItems=items.filter(q=>wrongIds.has(q._id));setItems(wrongItems);setPicked({});setResult(null);setMessage("Retry only the questions you missed.");}}>Retry incorrect questions</button>}</>}
  <div className="education-live-catalogue education-study-plan"><div className="education-live-catalogue-heading"><h4>Personalized study plan</h4><span>{studyPlan.filter(t=>completedPlan[t.id]).length}/{studyPlan.length} completed</span></div><p>Suggested actions for {subject}, based on your recent saved results.</p>{studyPlan.map(task=><label className={"education-study-task "+(completedPlan[task.id]?"completed":"")} key={task.id}><input type="checkbox" checked={Boolean(completedPlan[task.id])} onChange={()=>togglePlanTask(task.id)}/><span><strong>{task.title}</strong><small>{task.detail}</small></span></label>)}</div>
  <div className="education-live-catalogue education-daily-goal"><div className="education-live-catalogue-heading"><h4>My daily study goal</h4><label>Target <select aria-label="Daily question goal" value={dailyGoal} onChange={e=>saveDailyGoal(Number(e.target.value))}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option></select></label></div><p>Today: <strong>{todayAnswered}/{dailyGoal}</strong> questions answered in saved tests.</p><div className="education-progress-track" role="progressbar" aria-label="Daily study goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={dailyPercent}><span style={{width:dailyPercent+"%"}} /></div><small>{dailyPercent>=100?"Daily target achieved — great work!":"Keep going; your progress updates when a test is saved."} Goal is saved on this browser for the selected board, class and subject.</small></div>
  {history.length>0&&<><div className="education-progress-summary" aria-label="Learning progress summary"><article><small>Tests completed · last 50</small><strong>{history.length}</strong></article><article><small>Average score</small><strong>{Math.round(history.reduce((sum,a)=>sum+Number(a.scorePercent||0),0)/history.length)}%</strong></article><article><small>Best score</small><strong>{Math.max(...history.map(a=>Number(a.scorePercent||0)))}%</strong></article></div><div className="education-live-catalogue"><div className="education-live-catalogue-heading"><h4>Progress by subject</h4><span>Based on saved attempts</span></div>{[...new Set(history.map(a=>a.subject))].map(name=>{const rows=history.filter(a=>a.subject===name),average=Math.round(rows.reduce((sum,a)=>sum+Number(a.scorePercent||0),0)/rows.length);return <article className="education-catalogue-entry" key={name}><div><h5>{name}</h5><p>{rows.length} test{rows.length===1?"":"s"} · average {average}% · best {Math.max(...rows.map(a=>Number(a.scorePercent||0)))}%</p><div className="education-progress-track" role="progressbar" aria-label={name+" average score"} aria-valuemin="0" aria-valuemax="100" aria-valuenow={average}><span style={{width:average+"%"}} /></div></div></article>})}</div><div className="education-live-catalogue"><div className="education-live-catalogue-heading"><h4>Chapter-wise performance</h4><span>Based on saved answers</span></div>{(()=>{const attempts=history.filter(a=>a.board===board&&Number(a.grade)===Number(String(grade).replace("Class ",""))&&a.subject===subject);const chapters={};attempts.forEach(a=>(a.answers||[]).forEach(answer=>{const key=answer.chapter||"Uncategorized";if(!chapters[key])chapters[key]={total:0,correct:0};chapters[key].total+=1;if(answer.correct)chapters[key].correct+=1;}));const rows=Object.entries(chapters).map(([name,v])=>({...v,name,score:Math.round(v.correct/v.total*100)})).sort((a,b)=>a.score-b.score);return rows.length?rows.map(row=><article className="education-catalogue-entry" key={row.name}><div><h5>{row.name}</h5><p>{row.correct}/{row.total} correct · {row.score}%</p><div className="education-progress-track" role="progressbar" aria-label={row.name+" chapter score"} aria-valuemin="0" aria-valuemax="100" aria-valuenow={row.score}><span style={{width:row.score+"%"}} /></div><small>{row.score<60?"Needs more practice":row.score<80?"Keep practising":"Good progress"}</small></div></article>):<p className="education-catalogue-empty">Chapter progress will appear after you complete and save a test for this board, class and subject.</p>;})()}</div></>}
  <div className="education-live-catalogue"><div className="education-live-catalogue-heading"><h4>My recent test results</h4><button type="button" onClick={loadHistory}>Refresh</button></div>{history.length?history.slice(0,5).map(a=><p key={a._id}>{a.board} · Class {a.grade} · {a.subject} — <strong>{a.scorePercent}%</strong> ({a.correctCount}/{a.totalQuestions}) <small>{new Date(a.createdAt).toLocaleDateString()}</small></p>):<p className="education-catalogue-empty">Your saved test results will appear here.</p></div>
 </section>;
}

function EducationResources({ auth, apiBase }) {
  const [board, setBoard] = useState("CBSE");
  const [grade, setGrade] = useState("Class 10");
  const [subject, setSubject] = useState("Mathematics");
  const [bookType, setBookType] = useState("Textbooks");
  const [testSubject, setTestSubject] = useState("Mathematics");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [catalogueResources, setCatalogueResources] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueMessage, setCatalogueMessage] = useState("");
  useEffect(() => {
    if (!auth?.token || !apiBase) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ board, grade: String(Number(grade.replace("Class ", ""))), subject, type: bookType });
    setCatalogueLoading(true);
    fetch(`${apiBase}/api/education/resources?${params.toString()}`, { headers: { Authorization: `Bearer ${auth.token}` }, signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not load catalogue"); return data; })
      .then(data => { setCatalogueResources(data.resources || []); setCatalogueMessage(data.message || ""); })
      .catch(error => { if (error.name !== "AbortError") setCatalogueMessage(error.message || "Could not load catalogue"); })
      .finally(() => { if (!controller.signal.aborted) setCatalogueLoading(false); });
    return () => controller.abort();
  }, [auth?.token, apiBase, board, grade, subject, bookType]);
  const matchingQuestions = PRACTICE_QUESTIONS.filter(q => q.subject === testSubject);
  const currentQuestion = matchingQuestions[questionIndex];
  const completed = currentQuestion && Object.prototype.hasOwnProperty.call(answers, currentQuestion.subject);
  const restartTest = nextSubject => { setTestSubject(nextSubject || testSubject); setQuestionIndex(0); setAnswers({}); };
  const sourceUrl = board === "CBSE"
    ? (bookType === "Textbooks" ? "https://ncert.nic.in/textbook.php" : "https://www.cbse.gov.in/")
    : "https://cisce.org/";
  const resourceDescription = board === "CBSE"
    ? (bookType === "Textbooks" ? "Open the NCERT textbook portal and choose the relevant class and subject." : "Check CBSE curriculum, syllabus, academic resources and official notices.")
    : "Check the official CISCE site for current curriculum, regulations and applicable prescribed-resource information.";
  return <div className="education-resource-suite">
    <section className="education-books" aria-labelledby="education-books-title">
      <div className="education-resource-heading"><span className="house-kicker">SHIVASHA EDUTECH · RESOURCE DIRECTORY</span><h3 id="education-books-title">Books & study resources</h3><p>Filter by board, class, subject and resource type. Official sources are prioritised; prescribed books can change by academic year.</p></div>
      <div className="education-catalogue-filters">
        <label>Board<select value={board} onChange={e=>setBoard(e.target.value)}><option>CBSE</option><option>ICSE</option><option>ISC</option></select></label>
        <label>Class<select value={grade} onChange={e=>setGrade(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1}>Class {i+1}</option>)}</select></label>
        <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{EDUCATION_SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Resource type<select value={bookType} onChange={e=>setBookType(e.target.value)}><option>Textbooks</option><option>Workbooks</option><option>Reference Books</option><option>Exam Preparation</option><option>Digital Learning</option></select></label>
      </div>
      <article className="education-resource-result">
        <div className="education-resource-result-icon">📚</div><div className="education-resource-result-copy"><span className="education-board-tag">{board} · {grade} · {subject}</span><h4>{bookType}</h4><p>{resourceDescription} Shivasha currently links to official resource portals; it does not yet maintain a verified title-by-title inventory for every class.</p><a href={sourceUrl} target="_blank" rel="noopener noreferrer">Open official resource ↗</a></div>
      </article>
      <div className="education-live-catalogue" aria-live="polite">
        <div className="education-live-catalogue-heading"><h4>Matching catalogue entries</h4><span>{catalogueLoading ? "Loading…" : `${catalogueResources.length} found`}</span></div>
        {catalogueMessage && !catalogueResources.length && <p className="education-catalogue-empty">{catalogueMessage}</p>}
        {catalogueResources.map(resource => <article className="education-catalogue-entry" key={resource._id}>
          <div><span className={resource.verified ? "education-verified-tag" : "education-unverified-tag"}>{resource.verified ? "✓ Verified source" : "Pending verification"}</span><h5>{resource.title}</h5><p>{[resource.author, resource.publisher, resource.edition, resource.language].filter(Boolean).join(" · ")}</p><small>{resource.board} · Class {resource.grade} · {resource.subject} · {resource.resourceType}</small></div>
          <a href={resource.sourceUrl} target="_blank" rel="noopener noreferrer">View source ↗</a>
        </article>)}
      </div>
      <div className="education-book-list">
        <article><span>01</span><div><strong>Textbooks</strong><p>Official textbooks and board-prescribed learning materials.</p></div></article>
        <article><span>02</span><div><strong>Workbooks & practice books</strong><p>Chapter exercises, worksheets and answer practice; verify the edition before purchase.</p></div></article>
        <article><span>03</span><div><strong>Reference books</strong><p>Supplementary explanations for additional practice, matched to the current syllabus.</p></div></article>
        <article><span>04</span><div><strong>Exam preparation</strong><p>Official sample/specimen papers and revision resources where available.</p></div></article>
      </div>
      <p className="education-books-note">Book listing safeguards: show title, author/publisher, edition/year, board, class, subject and source. Do not upload or redistribute copyrighted books without permission.</p>
    </section>
    {auth?.user?.role === "admin" && <EducationAdminPanel auth={auth} apiBase={apiBase} />}
    <EducationQuizApi auth={auth} apiBase={apiBase} board={board} grade={grade} subject={subject} />
    <section className="education-practice" aria-labelledby="education-practice-title">
      <div className="education-resource-heading"><span className="house-kicker">LEARN BY DOING</span><h3 id="education-practice-title">Quick Practice Test</h3><p>Try a short sample question by subject. This is a prototype quiz, not an official board exam or a class-specific assessment yet.</p></div>
      <div className="education-practice-toolbar"><label>Subject<select value={testSubject} onChange={e=>restartTest(e.target.value)}>{EDUCATION_SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label><span>Question {questionIndex+1} of {matchingQuestions.length}</span></div>
      {currentQuestion && <div className="education-question-card"><h4>{currentQuestion.question}</h4><div className="education-answer-options">{currentQuestion.options.map((option,i)=><button type="button" key={option} disabled={completed} className={completed&&i===currentQuestion.answer?"correct":completed&&answers[currentQuestion.subject]===i?"incorrect":""} onClick={()=>setAnswers(prev=>({...prev,[currentQuestion.subject]:i}))}>{String.fromCharCode(65+i)}. {option}</button>)}</div>{completed&&<div className={answers[currentQuestion.subject]===currentQuestion.answer?"education-answer-feedback correct":"education-answer-feedback incorrect"} role="status">{answers[currentQuestion.subject]===currentQuestion.answer?"Correct!":"Not quite."} {currentQuestion.explain}</div>}<div className="education-practice-actions">{completed&&questionIndex<matchingQuestions.length-1&&<button type="button" className="primary" onClick={()=>setQuestionIndex(i=>i+1)}>Next question →</button>}{completed&&questionIndex===matchingQuestions.length-1&&<button type="button" className="primary" onClick={()=>restartTest()}>Try again ↻</button>}</div></div>}
    </section>
  </div>;
}

export default function HouseExplorer({ auth, apiBase }) {
  const [selectedCategory, setSelectedCategory] = useState("dharma");
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState("");
  const [showPhases, setShowPhases] = useState(false);
  const visible = useMemo(() => HOUSES.filter(h => h.purushartha === selectedCategory && (h.name + " " + h.hindi + " " + h.purpose + " " + h.modules.join(" ")).toLowerCase().includes(query.toLowerCase())), [query, selectedCategory]);
  const active = HOUSES.find(h => h.number === selected) || HOUSES[0];
  const category = PURUSHARTHAS.find(p => p.id === selectedCategory) || PURUSHARTHAS[0];
  const chooseCategory = id => { setSelectedCategory(id); const firstHouse = HOUSES.find(h => h.purushartha === id); if (firstHouse) setSelected(firstHouse.number); setQuery(""); };

  return <section className="content house-explorer">
    <div className="house-hero">
      <div className="house-hero-copy">
        <span className="house-kicker">SHIVASHA SOFTWARE COMPANY · FLAGSHIP PRODUCT</span>
        <h2>Four purposes. <span>One ecosystem.</span></h2>
        <p>Explore Shivasha through the four Purusharthas — Dharma, Artha, Kaam and Moksh. The 12 Jyotish houses become subcategories inside these four main sections.</p>
        <div className="house-hero-stats"><span><b>4</b> Main Categories</span><span><b>12</b> House Subcategories</span><span><b>15</b> Product Modules</span></div>
      </div>
      <div className="purushartha-hero-visual" aria-label="Dharma, Artha, Kaam and Moksh">
        <div className="purushartha-orbit"></div>
        {PURUSHARTHAS.map(p => <div key={p.id} className={"purushartha-orbit-item " + p.color}><span>{p.icon}</span><b>{p.name}</b><small>{p.english}</small></div>)}
        <div className="purushartha-orbit-center"><b>S</b><small>SHIVASHA</small></div>
      </div>
    </div>

    <div className="purushartha-grid" aria-label="Four main categories">
      {PURUSHARTHAS.map(p => <button key={p.id} type="button" className={"purushartha-card " + p.color + (selectedCategory === p.id ? " selected" : "")} onClick={() => chooseCategory(p.id)} aria-pressed={selectedCategory === p.id}>
        <span className="purushartha-icon">{p.icon}</span><span className="purushartha-english">{p.english}</span><strong>{p.name}</strong><span className="purushartha-tagline">{p.tagline}</span><p>{p.description}</p><small>Houses {p.houses.join(" · ")}</small>
      </button>)}
    </div>
    <div className="house-section-heading"><div><span className="house-kicker">{category.english} · SUBCATEGORIES</span><h2>{category.name}: 3 House Categories</h2><p>{category.description} Choose a house to explore its purpose, features and mapped modules.</p></div><label className="house-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search within this category" aria-label="Search houses or modules" /></label></div>
    <div className="house-grid">
      {visible.map(h => <button key={h.number} type="button" className={selected === h.number ? "house-card selected " + h.color : "house-card " + h.color} onClick={() => { setSelected(h.number); setSelectedCategory(h.purushartha); }} aria-pressed={selected === h.number}>
        <span className="house-card-top"><span className="house-number">{String(h.number).padStart(2, "0")}</span><span className="house-symbol">{h.symbol}</span></span>
        <span className="house-card-hindi">{h.hindi}</span><strong>{h.name}</strong><span className="house-card-purpose">{h.purpose}</span>
        <span className="house-card-modules">{h.modules.length} mapped module{h.modules.length === 1 ? "" : "s"}</span>
      </button>)}
    </div>
    {visible.length === 0 && <div className="panel empty">No house or module matched your search.</div>}

    <section className={"house-detail " + active.color}>
      <div className="house-detail-title"><span className="house-detail-symbol">{active.symbol}</span><div><span className="house-kicker">{category.english} · {active.hindi} · HOUSE {String(active.number).padStart(2, "0")}</span><h2>{active.name}</h2><p>{active.purpose}</p></div></div>
      <div className="house-detail-columns"><div><h3>Mapped product modules</h3><ul className="house-module-list">{active.modules.map(m => <li key={m}>{m}</li>)}</ul><p className="house-phase"><b>Roadmap:</b> {active.phase}</p></div><div><h3>Planned capabilities</h3><ul className="house-feature-list">{active.features.map(f => <li key={f}>{f}</li>)}</ul></div></div>
      <p className="house-note">This is the navigation and product-mapping foundation. Features marked in the roadmap are plans, not claims that every service is already implemented or enabled.</p>
    </section>

    {active.number === 5 && <section className="education-board-panel" aria-labelledby="education-board-title">
      <div className="education-panel-heading"><span className="house-kicker">SHIVASHA EDUTECH · SCHOOL LEARNING</span><h2 id="education-board-title">Choose your education board</h2><p>Explore curriculum information and subject-wise book suggestions. Select the student’s class to narrow resources.</p></div>
      <div className="education-board-grid">
        <article className="education-board-card cbse"><span className="education-board-tag">NATIONAL CURRICULUM</span><h3>CBSE Board</h3><p>Central Board of Secondary Education</p><ul><li>Classes 1–12</li><li>NCERT textbooks and syllabus resources</li><li>Subject-wise revision and practice</li></ul><a href="https://www.cbse.gov.in/" target="_blank" rel="noreferrer">Official CBSE website ↗</a><a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">NCERT textbook portal ↗</a></article>
        <article className="education-board-card icse"><span className="education-board-tag">CISCE CURRICULUM</span><h3>ICSE / ISC</h3><p>Indian Certificate of Secondary Education / ISC</p><ul><li>ICSE Classes 1–10 resources</li><li>ISC Classes 11–12 resources</li><li>Subject-wise prescribed and reference books</li></ul><a href="https://cisce.org/" target="_blank" rel="noreferrer">Official CISCE website ↗</a></article>
      </div>
      <EducationResources auth={auth} apiBase={apiBase} />
      <section className="education-videos" aria-labelledby="education-videos-title">
        <div className="education-videos-heading"><span className="house-kicker">WATCH · LEARN · PRACTISE</span><h3 id="education-videos-title">Related Educational Videos</h3><p>Find chapter explanations, concept lessons, revision classes and exam-preparation videos relevant to the chosen board and class.</p></div>
        <div className="education-video-filters">
          <label>Board<select id="education-video-board" defaultValue="CBSE"><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="ISC">ISC</option></select></label>
          <label>Class<select id="education-video-class" defaultValue="Class 10">{Array.from({length:12},(_,i)=><option key={i+1} value={`Class ${i+1}`}>{`Class ${i+1}`}</option>)}</select></label>
          <label>Subject<select id="education-video-subject" defaultValue="Mathematics"><option>Mathematics</option><option>Science</option><option>Physics</option><option>Chemistry</option><option>Biology</option><option>English</option><option>Hindi</option><option>Social Science</option><option>History</option><option>Geography</option><option>Computer Science</option></select></label>
        </div>
        <div className="education-video-actions">
          <button type="button" onClick={() => { const board=document.getElementById("education-video-board").value; const grade=document.getElementById("education-video-class").value; const subject=document.getElementById("education-video-subject").value; window.open("https://www.youtube.com/results?search_query="+encodeURIComponent(board+" "+grade+" "+subject+" chapter explanation"),"_blank","noopener,noreferrer"); }}>▶ Find chapter lessons</button>
          <button type="button" className="secondary" onClick={() => { const board=document.getElementById("education-video-board").value; const grade=document.getElementById("education-video-class").value; const subject=document.getElementById("education-video-subject").value; window.open("https://www.youtube.com/results?search_query="+encodeURIComponent(board+" "+grade+" "+subject+" revision sample paper exam preparation"),"_blank","noopener,noreferrer"); }}>✦ Revision & exam preparation</button>
        </div>
        <div className="education-video-topics"><span>Explore video types</span><div><span>Chapter explanations</span><span>Concept animations</span><span>Revision lessons</span><span>Sample-paper solutions</span><span>Practical demonstrations</span></div></div>
        <p className="education-video-note">These buttons open YouTube search results based on the selected board, class and subject. Videos are not yet individually curated or embedded inside Shivasha; review channel quality and syllabus alignment before featuring specific videos.</p>
      </section>
      <p className="education-books-note">Shivasha should show board, class, subject, book title, author/publisher, edition/year and official or seller source for each listing. Verify the current syllabus and prescribed list before recommending a book; avoid uploading copyrighted books without permission.</p>
    </section>}

    <section className="phase-roadmap">
      <button className="phase-toggle" type="button" onClick={() => setShowPhases(v => !v)} aria-expanded={showPhases}><span><span className="house-kicker">DELIVERY PLAN</span><strong>7 Development Phases</strong><small>Expand the staged roadmap</small></span><span className="phase-toggle-icon">{showPhases ? "−" : "+"}</span></button>
      {showPhases && <div className="phase-list">{PHASES.map(([n, title, description]) => <article className="phase-item" key={n}><span className="phase-number">{n}</span><div><h3>Phase {n} · {title}</h3><p>{description}</p></div></article>)}</div>}
    </section>
    <p className="house-disclaimer">The four Purusharthas are the primary categories. The 12 houses are grouped using the traditional Jyotish purpose mapping: Dharma (1, 5, 9), Artha (2, 6, 10), Kaam (3, 7, 11), Moksh (4, 8, 12). The digital product mapping is a modern organization of Shivasha features.</p>
  </section>;
}
