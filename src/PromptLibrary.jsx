import React, { useEffect, useMemo, useState } from "react";
import "./PromptLibrary.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const LANGUAGES = ["All languages", "English", "Hindi", "Bilingual"];

async function request(path, auth, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Prompt Library request failed.");
  return data;
}

export default function PromptLibrary({ auth: initialAuth = null }) {
  const [auth, setAuth] = useState(initialAuth);
  const [categories, setCategories] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("All languages");
  const [activePrompt, setActivePrompt] = useState(null);
  const [tab, setTab] = useState("browse");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" });
  const [authMode, setAuthMode] = useState("login");
  const [promptForm, setPromptForm] = useState({ title: "", summary: "", body: "", category: "business", language: "English", tags: "" });
  const [reviewItems, setReviewItems] = useState([]);

  const loadCategories = async () => {
    try { const data = await request("/api/prompts/categories", auth); setCategories(data.categories || []); }
    catch (error) { setNotice(error.message); }
  };
  const loadPrompts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (query.trim()) params.set("q", query.trim());
      if (category !== "all") params.set("category", category);
      if (language !== "All languages") params.set("language", language);
      const data = await request("/api/prompts?" + params.toString(), auth);
      setPrompts(data.items || []);
      setNotice("");
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  };
  const loadFavorites = async () => {
    if (!auth?.token) return;
    try { const data = await request("/api/prompts/favorites", auth); setFavorites(data.items || []); }
    catch (error) { setNotice(error.message); }
  };
  const loadReview = async () => {
    try { const data = await request("/api/prompts/admin/review", auth); setReviewItems(data.items || []); }
    catch (error) { setNotice(error.message); }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadPrompts(); }, [category, language]);
  useEffect(() => { if (auth?.token) { loadFavorites(); } else { setFavorites([]); } }, [auth?.token]);
  useEffect(() => { if (tab === "review" && auth?.token) loadReview(); }, [tab, auth?.token]);

  const visiblePrompts = useMemo(() => prompts, [prompts]);
  const signIn = async event => {
    event.preventDefault();
    try {
      const data = await request("/api/auth/" + authMode, null, { method: "POST", body: JSON.stringify(loginForm) });
      if (authMode === "register") { setAuthMode("login"); setNotice("Account created. Please log in."); }
      else { setAuth(data); if (!initialAuth) localStorage.setItem("shivasha_prompt_auth", JSON.stringify(data)); setLoginOpen(false); setNotice("Signed in successfully."); }
    } catch (error) { setNotice(error.message); }
  };
  const signOut = () => { setAuth(initialAuth); if (!initialAuth) localStorage.removeItem("shivasha_prompt_auth"); setNotice("Signed out."); };
  const openPrompt = async item => {
    try { const data = await request("/api/prompts/" + encodeURIComponent(item.slug), auth); setActivePrompt(data.item); setTab("detail"); }
    catch (error) { setNotice(error.message); }
  };
  const copyPrompt = async item => {
    try {
      await navigator.clipboard.writeText(item.body);
      if (item.accessTier === "free") await request("/api/prompts/" + item._id + "/copy", auth, { method: "POST", body: "{}" });
      setNotice("Prompt copied to clipboard.");
    } catch (error) { setNotice(error.message || "Clipboard access is unavailable in this browser."); }
  };
  const toggleFavorite = async item => {
    if (!auth?.token) { setLoginOpen(true); setNotice("Log in to save favourites."); return; }
    try {
      const exists = favorites.some(f => f._id === item._id);
      await request("/api/prompts/" + item._id + "/favorite", auth, { method: exists ? "DELETE" : "POST", body: "{}" });
      await loadFavorites();
    } catch (error) { setNotice(error.message); }
  };
  const submitPrompt = async event => {
    event.preventDefault();
    if (!auth?.token) { setLoginOpen(true); return; }
    try {
      await request("/api/prompts", auth, { method: "POST", body: JSON.stringify({ ...promptForm, tags: promptForm.tags.split(",").map(x => x.trim()).filter(Boolean), status: "pending" }) });
      setNotice("Prompt submitted for admin review.");
      setPromptForm({ title: "", summary: "", body: "", category: categories[0]?.slug || "business", language: "English", tags: "" });
      setTab("browse");
    } catch (error) { setNotice(error.message); }
  };
  const review = async (item, status) => {
    try {
      await request("/api/prompts/admin/" + item._id + "/review", auth, { method: "PATCH", body: JSON.stringify({ status }) });
      setReviewItems(prev => prev.filter(x => x._id !== item._id));
      setNotice("Moderation updated.");
    } catch (error) { setNotice(error.message); }
  };

  return <main className="prompt-library">
    <header className="pl-hero">
      <div><span className="pl-eyebrow">SHIVASHA · KNOWLEDGE TO ACTION</span><h2>AI Prompt Library</h2><p>Discover practical prompts, save your favourites and create reusable AI workflows.</p></div>
      <div className="pl-hero-actions">{auth?.token ? <><span className="pl-user">{auth.user?.name || auth.user?.email || "Member"}</span><button className="pl-btn pl-btn-light" onClick={signOut}>Sign out</button></> : <button className="pl-btn pl-btn-light" onClick={() => setLoginOpen(true)}>Log in / Join</button>}</div>
    </header>
    <nav className="pl-tabs" aria-label="Prompt Library sections">
      <button className={tab === "browse" ? "active" : ""} onClick={() => { setTab("browse"); setActivePrompt(null); }}>Explore prompts</button>
      <button className={tab === "favorites" ? "active" : ""} onClick={() => { setTab("favorites"); setActivePrompt(null); }}>★ Favourites</button>
      <button className={tab === "submit" ? "active" : ""} onClick={() => { setTab("submit"); setActivePrompt(null); }}>＋ Submit prompt</button>
      {auth?.user?.role === "admin" && <button className={tab === "review" ? "active" : ""} onClick={() => { setTab("review"); setActivePrompt(null); }}>Admin review</button>}
    </nav>
    {notice && <div className="pl-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {tab === "browse" && <>
      <div className="pl-search-row"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && loadPrompts()} placeholder="Search prompts, topics or tags…"/><button className="pl-btn" onClick={loadPrompts}>Search</button><select value={language} onChange={e => setLanguage(e.target.value)}>{LANGUAGES.map(x => <option key={x}>{x}</option>)}</select></div>
      <div className="pl-category-row"><button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}>All categories</button>{categories.map(item => <button key={item.slug} className={category === item.slug ? "selected" : ""} onClick={() => setCategory(item.slug)}>{item.icon} {item.name}</button>)}</div>
      {loading ? <div className="pl-empty">Loading prompts…</div> : visiblePrompts.length ? <div className="pl-grid">{visiblePrompts.map(item => <article className="pl-card" key={item._id}><div className="pl-card-top"><span>{categories.find(c => c.slug === item.category)?.icon || "🧠"} {item.category}</span><span className={item.accessTier === "premium" ? "pl-tier premium" : "pl-tier"}>{item.accessTier}</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="pl-tags">{(item.tags || []).slice(0, 4).map(tag => <span key={tag}>#{tag}</span>)}</div><div className="pl-card-meta"><span>{item.language} · {item.difficulty}</span><span>↗ {item.copies || 0} copies</span></div><div className="pl-card-actions"><button className="pl-btn" onClick={() => openPrompt(item)}>View prompt</button><button className="pl-icon-btn" onClick={() => toggleFavorite(item)} aria-label="Save favourite">☆</button></div></article>)}</div> : <div className="pl-empty">No published prompts match this search yet. Try another category or add a prompt for review.</div>}
    </>}
    {tab === "detail" && activePrompt && <section className="pl-detail"><button className="pl-back" onClick={() => setTab("browse")}>← Back to prompts</button><span className="pl-eyebrow">{activePrompt.category} · {activePrompt.language}</span><h2>{activePrompt.title}</h2><p>{activePrompt.summary}</p><pre>{activePrompt.body}</pre>{activePrompt.instructions && <div><h3>How to use</h3><p>{activePrompt.instructions}</p></div>}{activePrompt.exampleOutput && <div><h3>Example output</h3><pre>{activePrompt.exampleOutput}</pre></div>}<div className="pl-detail-actions"><button className="pl-btn" onClick={() => copyPrompt(activePrompt)}>Copy prompt</button><button className="pl-btn pl-btn-outline" onClick={() => toggleFavorite(activePrompt)}>☆ Save favourite</button></div></section>}
    {tab === "favorites" && <section><h2>Your favourite prompts</h2>{!auth?.token ? <div className="pl-empty">Log in to save and view favourites. <button className="pl-btn" onClick={() => setLoginOpen(true)}>Log in</button></div> : favorites.length ? <div className="pl-grid">{favorites.map(item => <article className="pl-card" key={item._id}><span className="pl-tier">Saved</span><h3>{item.title}</h3><p>{item.summary}</p><button className="pl-btn" onClick={() => openPrompt(item)}>View prompt</button></article>)}</div> : <div className="pl-empty">No favourites saved yet.</div>}</section>}
    {tab === "submit" && <form className="pl-form" onSubmit={submitPrompt}><h2>Share a useful prompt</h2><p>New submissions are reviewed by a SHIVASHA admin before public publishing.</p><label>Prompt title<input required maxLength="140" value={promptForm.title} onChange={e => setPromptForm({...promptForm,title:e.target.value})}/></label><label>Short description<input required maxLength="320" value={promptForm.summary} onChange={e => setPromptForm({...promptForm,summary:e.target.value})}/></label><label>Category<select value={promptForm.category} onChange={e => setPromptForm({...promptForm,category:e.target.value})}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label>Language<select value={promptForm.language} onChange={e => setPromptForm({...promptForm,language:e.target.value})}><option>English</option><option>Hindi</option><option>Bilingual</option></select></label><label>Tags (comma separated)<input value={promptForm.tags} onChange={e => setPromptForm({...promptForm,tags:e.target.value})} placeholder="business, marketing, writing"/></label><label>Full prompt<textarea required rows="9" maxLength="12000" value={promptForm.body} onChange={e => setPromptForm({...promptForm,body:e.target.value})} placeholder="Act as… Your task is… Output format…"/></label><button className="pl-btn" type="submit">Submit for review</button></form>}
    {tab === "review" && <section><h2>Pending prompt review</h2>{reviewItems.length ? reviewItems.map(item => <article className="pl-review" key={item._id}><h3>{item.title}</h3><p>{item.summary}</p><pre>{item.body}</pre><button className="pl-btn" onClick={() => review(item,"published")}>Approve & publish</button> <button className="pl-btn pl-btn-danger" onClick={() => review(item,"rejected")}>Reject</button></article>) : <div className="pl-empty">No prompts are waiting for review.</div>}</section>}
    {loginOpen && <div className="pl-modal-backdrop" role="presentation" onClick={e => e.target === e.currentTarget && setLoginOpen(false)}><form className="pl-modal" onSubmit={signIn}><button type="button" className="pl-modal-close" onClick={() => setLoginOpen(false)}>×</button><h2>{authMode === "login" ? "Log in to SHIVASHA" : "Create your SHIVASHA account"}</h2>{authMode === "register" && <label>Name<input required value={loginForm.name} onChange={e => setLoginForm({...loginForm,name:e.target.value})}/></label>}<label>Email<input required type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm,email:e.target.value})}/></label><label>Password<input required type="password" minLength="8" value={loginForm.password} onChange={e => setLoginForm({...loginForm,password:e.target.value})}/></label><button className="pl-btn" type="submit">{authMode === "login" ? "Log in" : "Create account"}</button><button type="button" className="pl-link" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button></form></div>}
  </main>;
}
