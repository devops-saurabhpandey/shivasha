import React, { useCallback, useEffect, useState } from "react";

const BOARDS = ["CBSE", "ICSE", "ISC"];
const SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"];

export default function EducationAdminPanel({ auth, apiBase }) {
  const [form, setForm] = useState({ board: "CBSE", grade: "10", subject: "Mathematics", chapter: "", question: "", options: "", answerIndex: "0", explanation: "", sourceUrl: "" });
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState("");

  const load = useCallback(async () => {
    if (!auth?.token || !apiBase) return;
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("published", filter);
      const response = await fetch(apiBase + "/api/education/quiz/admin/questions?" + params, { headers: { Authorization: "Bearer " + auth.token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load questions");
      setRows(data.questions || []);
    } catch (error) { setMessage(error.message); }
  }, [auth?.token, apiBase, filter]);

  useEffect(() => { load(); }, [load]);
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  function editQuestion(question) {
    setEditingId(question._id);
    setForm({
      board: question.board, grade: String(question.grade), subject: question.subject,
      chapter: question.chapter || "", question: question.question || "",
      options: (question.options || []).join("\n"), answerIndex: String(question.answerIndex ?? 0),
      explanation: question.explanation || "", sourceUrl: question.sourceUrl || ""
    });
    setMessage("Editing draft. Check the correct answer before saving.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeQuestion(id) {
    if (!window.confirm("Permanently delete this question?")) return;
    try {
      const response = await fetch(apiBase + "/api/education/quiz/questions/" + id, { method: "DELETE", headers: { Authorization: "Bearer " + auth.token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setMessage("Question deleted.");
      if (editingId === id) setEditingId("");
      await load();
    } catch (error) { setMessage(error.message); }
  }

  async function publishQuestion(id) {
    try {
      const response = await fetch(apiBase + "/api/education/quiz/questions/" + id + "/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify({ published: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Publish failed");
      setMessage("Question published for students.");
      await load();
    } catch (error) { setMessage(error.message); }
  }

  async function unpublishQuestion(id) {
    try {
      const response = await fetch(apiBase + "/api/education/quiz/questions/" + id + "/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify({ published: false })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unpublish failed");
      setMessage("Question moved back to draft. You can edit it now.");
      await load();
    } catch (error) { setMessage(error.message); }
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const options = form.options.split("\n").map(value => value.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 6) { setMessage("Enter 2–6 options, one per line."); return; }
    const answerIndex = Number(form.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) { setMessage("The selected correct option does not exist. Choose a valid option."); return; }
    setBusy(true);
    try {
      const response = await fetch(apiBase + "/api/education/quiz/questions" + (editingId ? "/" + editingId : ""), {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
        body: JSON.stringify({ ...form, grade: Number(form.grade), options, answerIndex: Number(form.answerIndex) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Save failed");
      setMessage(editingId ? "Draft updated." : "Question saved as a draft. Review before publishing.");
      setEditingId("");
      setForm(current => ({ ...current, chapter: "", question: "", options: "", answerIndex: "0", explanation: "", sourceUrl: "" }));
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <section className="education-practice education-admin-panel">
    <div className="education-resource-heading">
      <span className="house-kicker">ADMIN WORKSPACE · SHIVASHA EDUTECH</span>
      <h3>Question bank manager</h3>
      <p>Create draft MCQs and publish reviewed questions for students. Server-side access checks still apply.</p>
    </div>
    <form className="education-catalogue-filters education-admin-form" onSubmit={submit}>
      <label>Board<select value={form.board} onChange={event => change("board", event.target.value)}>{BOARDS.map(board => <option key={board}>{board}</option>)}</select></label>
      <label>Class<select value={form.grade} onChange={event => change("grade", event.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Class {i + 1}</option>)}</select></label>
      <label>Subject<select value={form.subject} onChange={event => change("subject", event.target.value)}>{SUBJECTS.map(subject => <option key={subject}>{subject}</option>)}</select></label>
      <label>Chapter<input required maxLength="160" value={form.chapter} onChange={event => change("chapter", event.target.value)} /></label>
      <label className="education-admin-wide">Question<textarea required maxLength="2000" rows="3" value={form.question} onChange={event => change("question", event.target.value)} /></label>
      <label className="education-admin-wide">Options (one per line)<textarea required rows="5" value={form.options} onChange={event => change("options", event.target.value)} placeholder={"Option A\nOption B\nOption C\nOption D"} /></label>
      <label>Correct option<select value={form.answerIndex} onChange={event => change("answerIndex", event.target.value)}>{[0, 1, 2, 3, 4, 5].map(index => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></label>
      <label>Source URL<input type="url" value={form.sourceUrl} onChange={event => change("sourceUrl", event.target.value)} /></label>
      <label className="education-admin-wide">Explanation<textarea rows="2" maxLength="2000" value={form.explanation} onChange={event => change("explanation", event.target.value)} /></label>
      <div className="education-admin-wide"><button className="primary" disabled={busy}>{busy ? (editingId ? "Updating…" : "Saving…") : (editingId ? "Update draft" : "Save as draft")}</button>{editingId && <button type="button" onClick={() => { setEditingId(""); setForm({ board: "CBSE", grade: "10", subject: "Mathematics", chapter: "", question: "", options: "", answerIndex: "0", explanation: "", sourceUrl: "" }); }}>Cancel edit</button>}</div>
    </form>
    {message && <p role="status" className="education-answer-feedback">{message}</p>}
    <div className="education-live-catalogue">
      <div className="education-live-catalogue-heading"><h4>Manage questions</h4><select aria-label="Filter questions" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option><option value="false">Drafts</option><option value="true">Published</option></select></div>
      {!rows.length && <p className="education-catalogue-empty">No questions match this filter yet.</p>}
      {rows.map(question => <article className="education-catalogue-entry" key={question._id}>
        <div><span className={question.published ? "education-verified-tag" : "education-unverified-tag"}>{question.published ? "Published" : "Draft"}</span><h5>{question.board} · Class {question.grade} · {question.subject}</h5><p><strong>{question.chapter}:</strong> {question.question}</p><small>{question.options?.length || 0} options · {question.sourceUrl ? "Source linked" : "No source URL"}</small></div>
        <div className="education-admin-actions">{!question.published ? <><button type="button" onClick={() => editQuestion(question)}>Edit</button><button type="button" className="primary" onClick={() => publishQuestion(question._id)}>Publish</button></> : <button type="button" onClick={() => unpublishQuestion(question._id)}>Move to draft</button>}<button type="button" onClick={() => removeQuestion(question._id)}>Delete</button></div>
      </article>)}
    </div>
  </section>;
}
