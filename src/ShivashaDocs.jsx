import React, { useCallback, useEffect, useRef, useState } from "react";

export default function ShivashaDocs({ auth, apiFetch }) {
  const [documents, setDocuments] = useState([]);
  const [current, setCurrent] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const revisionRef = useRef(0);
  const saveTimer = useRef(null);
  const latestRef = useRef({ title: "", content: "" });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/docs", auth);
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const openDocument = async (id) => {
    clearTimeout(saveTimer.current);
    setError("");
    setStatus("idle");
    try {
      const data = await apiFetch("/api/docs/" + id, auth);
      const doc = data.document;
      setCurrent(doc);
      setTitle(doc.title);
      setContent(doc.content || "");
      latestRef.current = { title: doc.title, content: doc.content || "" };
      revisionRef.current = doc.revision;
    } catch (e) { setError(e.message); }
  };

  const createDocument = async () => {
    setError("");
    try {
      const data = await apiFetch("/api/docs", auth, {
        method: "POST",
        body: JSON.stringify({ title: "Untitled document" })
      });
      await loadDocuments();
      await openDocument(data.document._id);
    } catch (e) { setError(e.message); }
  };

  const saveNow = useCallback(async (snapshot) => {
    if (!current?._id) return;
    setStatus("saving");
    setError("");
    try {
      const data = await apiFetch("/api/docs/" + current._id, auth, {
        method: "PATCH",
        body: JSON.stringify({ ...snapshot, revision: revisionRef.current })
      });
      revisionRef.current = data.document.revision;
      setCurrent(data.document);
      setDocuments(prev => prev.map(doc => doc._id === data.document._id
        ? { ...doc, title: data.document.title, revision: data.document.revision, updatedAt: data.document.updatedAt }
        : doc));
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  }, [auth, current?._id, apiFetch]);

  useEffect(() => {
    if (!current?._id) return;
    const snapshot = { title: title.trim() || "Untitled document", content };
    latestRef.current = snapshot;
    clearTimeout(saveTimer.current);
    setStatus("pending");
    saveTimer.current = setTimeout(() => saveNow(snapshot), 900);
    return () => clearTimeout(saveTimer.current);
  }, [title, content, current?._id, saveNow]);

  const deleteDocument = async () => {
    if (!current?._id || !window.confirm("Delete this document?")) return;
    try {
      await apiFetch("/api/docs/" + current._id, auth, { method: "DELETE" });
      setCurrent(null); setTitle(""); setContent("");
      await loadDocuments();
    } catch (e) { setError(e.message); }
  };

  const backToList = () => {
    clearTimeout(saveTimer.current);
    // A pending change is saved before returning to the list.
    if (current?._id && status === "pending") saveNow(latestRef.current).then(loadDocuments);
    setCurrent(null);
  };

  return <section className="content shivasha-docs">
    <div className="feed-head">
      <div><span className="eyebrow">SHIVASHA DRIVE</span><h2>Shivasha Doc</h2><p>Your documents, stored in your Shivasha account.</p></div>
      {current
        ? <button type="button" className="secondary" onClick={backToList}>← All documents</button>
        : <button type="button" className="primary" onClick={createDocument}>＋ New document</button>}
    </div>
    {error && <div className="login-message" role="alert">{error}</div>}
    {!current ? <div className="panel">
      {loading ? <div className="empty">Loading your documents…</div>
        : documents.length ? documents.map(doc => <button type="button" className="shivasha-doc-row" key={doc._id} onClick={() => openDocument(doc._id)}>
          <span aria-hidden="true">📄</span><span className="shivasha-doc-row-copy"><b>{doc.title}</b><small>Edited {new Date(doc.updatedAt).toLocaleString()} · Revision {doc.revision}</small></span><span>›</span>
        </button>)
        : <div className="empty"><div style={{fontSize:36}}>📄</div><h3>No documents yet</h3><p>Create your first document in Shivasha Drive.</p><button type="button" className="primary" onClick={createDocument}>Create document</button></div>}
    </div> : <div className="panel shivasha-doc-editor">
      <div className="shivasha-doc-toolbar">
        <input aria-label="Document title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="Document title"/>
        <span className={"shivasha-doc-status status-" + status} role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : status === "pending" ? "Changes pending…" : "Ready"}
        </span>
      </div>
      <textarea className="shivasha-doc-content" aria-label="Document content" value={content} maxLength={100000} onChange={e => setContent(e.target.value)} placeholder="Start writing your document…"/>
      <div className="shivasha-doc-footer"><small>Plain-text editor · Up to 100,000 characters · Private to your account</small><button type="button" className="secondary" onClick={deleteDocument}>Delete document</button></div>
    </div>}
  </section>;
}
