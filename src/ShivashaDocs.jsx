import React, { useCallback, useEffect, useRef, useState } from "react";

const ALLOWED_EDITOR_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "LI", "PRE", "CODE", "A", "HR"]);
const DROP_EDITOR_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE"]);

function escapeEditorText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sanitizeEditorHtml(input) {
  const parsed = new DOMParser().parseFromString(String(input || ""), "text/html");
  const cleanNode = node => {
    if (node.nodeType === Node.TEXT_NODE) return escapeEditorText(node.nodeValue || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName;
    if (DROP_EDITOR_TAGS.has(tag)) return "";
    const children = Array.from(node.childNodes).map(cleanNode).join("");
    if (!ALLOWED_EDITOR_TAGS.has(tag)) return children;
    if (tag === "A") {
      const href = (node.getAttribute("href") || "").trim();
      if (/^(https?:\\/\\/|mailto:)/i.test(href)) return '<a href="' + escapeEditorText(href) + '" target="_blank" rel="noopener noreferrer">' + children + "</a>";
      return children;
    }
    return "<" + tag.toLowerCase() + ">" + children + "</" + tag.toLowerCase() + ">";
  };
  return Array.from(parsed.body.childNodes).map(cleanNode).join("");
}

function toEditorHtml(value) {
  const raw = String(value || "");
  if (/<(?:p|br|strong|b|em|i|u|h[1-3]|blockquote|ul|ol|li|pre|code|a|hr)\\b/i.test(raw)) return sanitizeEditorHtml(raw);
  return escapeEditorText(raw).replace(/\\r?\\n/g, "<br>");
}

function editorWordCount(html) {
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (parsed.body.textContent || "").trim().split(/\\s+/).filter(Boolean).length;
}

export default function ShivashaDocs({ auth, apiFetch }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [preview, setPreview] = useState(false);
  const [editorLoadKey, setEditorLoadKey] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
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
      const params = new URLSearchParams({ folder: selectedFolder, page: String(page), limit: "25", q: searchTerm.trim() });
      const [data, folderData] = await Promise.all([apiFetch("/api/docs?" + params.toString(), auth), apiFetch("/api/docs/folders", auth)]);
      setFolders(folderData.folders || []);
      setDocuments(data.documents || []);
      setTotalPages(Math.max(1, data.totalPages || 1));
      setTotalDocuments(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [auth, selectedFolder, page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(loadDocuments, 250);
    return () => clearTimeout(timer);
  }, [loadDocuments]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!preview && editorRef.current) editorRef.current.innerHTML = toEditorHtml(content);
  }, [editorLoadKey, preview]);

  const openDocument = async (id) => {
    clearTimeout(saveTimer.current);
    setError("");
    setStatus("idle");
    try {
      const data = await apiFetch("/api/docs/" + id, auth);
      const doc = data.document;
      setCurrent(doc);
      setTitle(doc.title);
      const editorContent = toEditorHtml(doc.content || "");
      setContent(editorContent);
      setEditorLoadKey(key => key + 1);
      latestRef.current = { title: doc.title, content: editorContent };
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


  const loadVersions = async () => {
    if (!current?._id) return;
    setVersionsLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/docs/" + current._id + "/versions", auth);
      setVersions(data.versions || []);
      setShowVersions(true);
    } catch (e) { setError(e.message); }
    finally { setVersionsLoading(false); }
  };

  const restoreVersion = async (versionId) => {
    if (!current?._id || !window.confirm("Restore this older version? Your current content will also be saved in history.")) return;
    try {
      const data = await apiFetch("/api/docs/" + current._id + "/restore/" + versionId, auth, {
        method: "POST",
        body: JSON.stringify({ revision: revisionRef.current })
      });
      const doc = data.document;
      revisionRef.current = doc.revision;
      setCurrent(doc);
      setTitle(doc.title);
      const editorContent = toEditorHtml(doc.content || "");
      setContent(editorContent);
      setEditorLoadKey(key => key + 1);
      latestRef.current = { title: doc.title, content: editorContent };
      savedRef.current = latestRef.current;
      setStatus("saved");
      await loadDocuments();
      await loadVersions();
    } catch (e) { setError(e.message); }
  };

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

  const syncRichEditor = () => {
    if (!editorRef.current) return;
    setContent(sanitizeEditorHtml(editorRef.current.innerHTML));
  };

  const applyFormat = (command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    if (command === "createLink") {
      const url = window.prompt("Enter a link (https:// or mailto:)");
      if (!url || !/^(https?:\\/\\/|mailto:)/i.test(url.trim())) return;
      document.execCommand(command, false, url.trim());
    } else {
      document.execCommand(command, false, value);
    }
    syncRichEditor();
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
    {!current ? <><div className="shivasha-doc-folderbar"><label>Folder <select value={selectedFolder} onChange={e => { setSelectedFolder(e.target.value); setPage(1); }}><option value="all">All documents</option><option value="none">Unfiled</option>{folders.map(folder => <option key={folder._id} value={folder._id}>{folder.name}</option>)}</select></label><label>Search documents <input type="search" value={searchTerm} maxLength={100} placeholder="Search by title…" onChange={e => { setSearchTerm(e.target.value); setPage(1); }}/></label><button type="button" className="secondary" onClick={createFolder}>＋ Folder</button></div><div className="panel">
      {loading ? <div className="empty">Loading your documents…</div>
        : documents.length ? documents.map(doc => <button type="button" className="shivasha-doc-row" key={doc._id} onClick={() => openDocument(doc._id)}>
          <span aria-hidden="true">📄</span><span className="shivasha-doc-row-copy"><b>{doc.title}</b><small>Edited {new Date(doc.updatedAt).toLocaleString()} · Revision {doc.revision}</small></span><span>›</span>
        </button>)
        : <div className="empty"><div style={{fontSize:36}}>📄</div><h3>{searchTerm ? "No matching documents" : "No documents yet"}</h3><p>{searchTerm ? "Try another title or clear your search." : "Create your first document in Shivasha Drive."}</p>{!searchTerm && <button type="button" className="primary" onClick={createDocument}>Create document</button>}</div>}
      {totalDocuments > 0 && <div className="shivasha-doc-pagination"><small>{totalDocuments.toLocaleString()} documents · Page {page} of {totalPages}</small><div><button type="button" className="secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button><button type="button" className="secondary" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button></div></div>}
    </div></> : <div className="panel shivasha-doc-editor">
      <div className="shivasha-doc-toolbar">
        <input aria-label="Document title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} onBlur={() => { clearTimeout(saveTimer.current); if (latestRef.current.title !== savedRef.current.title || latestRef.current.content !== savedRef.current.content) saveNow(latestRef.current); }} placeholder="Document title"/>
        <span className={"shivasha-doc-status status-" + status} role="status" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : status === "pending" ? "Changes pending…" : "Ready"}
        </span>
      </div>
      <div className="shivasha-doc-tools" role="toolbar" aria-label="Text formatting"><button type="button" onClick={() => applyFormat("bold")}><b>B</b></button><button type="button" onClick={() => applyFormat("italic")}><i>I</i></button><button type="button" onClick={() => applyFormat("underline")}><u>U</u></button><button type="button" onClick={() => applyFormat("formatBlock", "H1")}>H1</button><button type="button" onClick={() => applyFormat("formatBlock", "H2")}>H2</button><button type="button" onClick={() => applyFormat("formatBlock", "P")}>Normal</button><button type="button" onClick={() => applyFormat("formatBlock", "BLOCKQUOTE")}>Quote</button><button type="button" onClick={() => applyFormat("insertUnorderedList")}>• List</button><button type="button" onClick={() => applyFormat("insertOrderedList")}>1. List</button><button type="button" onClick={() => applyFormat("formatBlock", "PRE")}>Code</button><button type="button" onClick={() => applyFormat("createLink")}>Link</button><button type="button" onClick={() => applyFormat("insertHorizontalRule")}>Divider</button><button type="button" onClick={() => applyFormat("removeFormat")}>Clear format</button><button type="button" onClick={loadVersions}>Version history</button></div>
      <label className="shivasha-doc-move">Move to folder <select value={current.folder || ""} onChange={e => moveToFolder(e.target.value)}><option value="">Unfiled</option>{folders.map(folder => <option key={folder._id} value={folder._id}>{folder.name}</option>)}</select></label>
      {showVersions && <div className="shivasha-doc-history"><div className="shivasha-doc-history-head"><b>Version history</b><button type="button" className="secondary" onClick={() => setShowVersions(false)}>Close</button></div>{versionsLoading ? <p>Loading versions…</p> : versions.length ? versions.map(version => <div className="shivasha-doc-version" key={version._id}><span><b>Revision {version.revision}</b><small>{new Date(version.createdAt).toLocaleString()} · {version.title}</small></span><button type="button" className="secondary" onClick={() => restoreVersion(version._id)}>Restore</button></div>) : <p>No saved versions yet. Versions are created when you edit the title or content.</p>}</div>}
      {preview
        ? <div className="shivasha-doc-preview" aria-label="Document preview" dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(content) }}/>
        : <div ref={editorRef} className="shivasha-doc-content shivasha-doc-rich-editor" role="textbox" aria-label="Document content" aria-multiline="true" contentEditable suppressContentEditableWarning onInput={syncRichEditor} onBlur={() => { clearTimeout(saveTimer.current); syncRichEditor(); saveNow(latestRef.current); }} data-placeholder="Start writing your document…"/>}
      <div className="shivasha-doc-footer"><small>{editorWordCount(content)} words · {content.length.toLocaleString()} / 100,000 characters · Rich text editor · Private to your account</small><button type="button" className="secondary" onClick={deleteDocument}>Delete document</button></div>
    </div>}
  </section>;
}
