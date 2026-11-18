import React, { useCallback, useEffect, useRef, useState } from "react";

export default function ShivashaDocs({ auth, apiFetch }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [preview, setPreview] = useState(false);
  const editorRef = useRef(null);
  const [current, setCurrent] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const revisionRef = useRef(0);
  const saveTimer = useRef(null);
  const latestRef = useRef({ title: "", content: "" });
  const savedRef = useRef({ title: "", content: "" });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, folderData] = await Promise.all([apiFetch("/api/docs?folder=" + encodeURIComponent(selectedFolder), auth), apiFetch("/api/docs/folders", auth)]);
      setFolders(folderData.folders || []);
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [auth, selectedFolder]);

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
      savedRef.current = latestRef.current;
      revisionRef.current = doc.revision;
    } catch (e) { setError(e.message); }
  };

  const createDocument = async () => {
    setError("");
    try {
      const data = await apiFetch("/api/docs", auth, {
        method: "POST",
        body: JSON.stringify({ title: "Untitled document", folderId: selectedFolder === "all" || selectedFolder === "none" ? null : selectedFolder })
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
      savedRef.current = snapshot;
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

  const createFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;
    try {
      const data = await apiFetch("/api/docs/folders", auth, { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setFolders(prev => [...prev, data.folder].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedFolder(data.folder._id);
    } catch (e) { setError(e.message); }
  };

  const moveToFolder = async (folderId) => {
    if (!current?._id) return;
    try {
      const data = await apiFetch("/api/docs/" + current._id, auth, { method: "PATCH", body: JSON.stringify({ folderId: folderId || null, revision: revisionRef.current }) });
      revisionRef.current = data.document.revision;
      setCurrent(data.document);
      setSavedSnapshotForMove();
      await loadDocuments();
    } catch (e) { setError(e.message); }
  };

  const setSavedSnapshotForMove = () => { savedRef.current = latestRef.current; };

  const applyFormat = (prefix, suffix = prefix) => {
    const field = editorRef.current;
    if (!field) return;
    const start = field.selectionStart, end = field.selectionEnd;
    const selected = content.slice(start, end);
    const next = content.slice(0, start) + prefix + (selected || "text") + suffix + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length); });
  };

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
        : <div className="shivasha-doc-actions"><button type="button" className="secondary" onClick={createFolder}>＋ New folder</button><button type="button" className="primary" onClick={createDocument}>＋ New document</button></div>}
    </div>
    {error && <div className="login-message" role="alert">{error}</div>}
    {!current ? <><div className="shivasha-doc-folderbar"><label>Folder <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}><option value="all">All documents</option><option value="none">Unfiled</option>{folders.map(folder => <option key={folder._id} value={folder._id}>{folder.name}</option>)}</select></label><button type="button" className="secondary" onClick={createFolder}>＋ Folder</button></div><div className="panel">
      {loading ? <div className="empty">Loading your documents…</div>
        : documents.length ? documents.map(doc => <button type="button" className="shivasha-doc-row" key={doc._id} onClick={() => openDocument(doc._id)}>
          <span aria-hidden="true">📄</span><span className="shivasha-doc-row-copy"><b>{doc.title}</b><small>Edited {new Date(doc.updatedAt).toLocaleString()} · Revision {doc.revision}</small></span><span>›</span>
        </button>)
        : <div className="empty"><div style={{fontSize:36}}>📄</div><h3>No documents yet</h3><p>Create your first document in Shivasha Drive.</p><button type="button" className="primary" onClick={createDocument}>Create document</button></div>}
    </div></> : <div className="panel shivasha-doc-editor">
      <div className="shivasha-doc-toolbar">
        <input aria-label="Document title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} onBlur={() => { clearTimeout(saveTimer.current); if (latestRef.current.title !== savedRef.current.title || latestRef.current.content !== savedRef.current.content) saveNow(latestRef.current); }} placeholder="Document title"/>
        <span className={"shivasha-doc-status status-" + status} role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : status === "pending" ? "Changes pending…" : "Ready"}
        </span>
      </div>
      <div className="shivasha-doc-tools"><button type="button" onClick={() => applyFormat("**")}>Bold</button><button type="button" onClick={() => applyFormat("*")}>Italic</button><button type="button" onClick={() => applyFormat("# ", "")}>Heading</button><button type="button" onClick={() => applyFormat("- ", "")}>• List</button><button type="button" onClick={() => applyFormat("1. ", "")}>Numbered</button><button type="button" onClick={() => setPreview(v => !v)}>{preview ? "Edit" : "Preview"}</button></div>
      <label className="shivasha-doc-move">Move to folder <select value={current.folder || ""} onChange={e => moveToFolder(e.target.value)}><option value="">Unfiled</option>{folders.map(folder => <option key={folder._id} value={folder._id}>{folder.name}</option>)}</select></label>
      {preview ? <div className="shivasha-doc-preview" aria-label="Document preview">{content.split("\n").map((line, index) => line.startsWith("# ") ? <h3 key={index}>{line.slice(2)}</h3> : line.startsWith("## ") ? <h4 key={index}>{line.slice(3)}</h4> : line.startsWith("- ") ? <p key={index}>• {line.slice(2)}</p> : line.trim() ? <p key={index}>{line}</p> : <br key={index}/>)}</div> : <textarea ref={editorRef} className="shivasha-doc-content" aria-label="Document content" value={content} maxLength={100000} onChange={e => setContent(e.target.value)} onBlur={() => { clearTimeout(saveTimer.current); saveNow(latestRef.current); }} placeholder="Start writing your document…"/>
      <div className="shivasha-doc-footer"><small>Markdown formatting · Up to 100,000 characters · Private to your account</small><button type="button" className="secondary" onClick={deleteDocument}>Delete document</button></div>
    </div>}
  </section>;
}
