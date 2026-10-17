import React, { useEffect, useMemo, useState } from "react";
import "./content-studio.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const CATEGORIES = [
  { id: "dharma", label: "धर्म", english: "DHARMA", icon: "☼", houses: ["Self & Identity", "Education & Creativity", "Knowledge & Philosophy"], description: "ज्ञान, शिक्षा, रचनात्मकता और जीवन की दिशा", tone: "dharma" },
  { id: "artha", label: "अर्थ", english: "ARTHA", icon: "₹", houses: ["Wealth & Finance", "Services & Wellbeing", "Career & Profession"], description: "धन, व्यवसाय, सेवाएँ और करियर", tone: "artha" },
  { id: "kaam", label: "काम", english: "KAAM", icon: "⇄", houses: ["Skills & Communication", "Business & Partnerships", "Networks & Growth"], description: "कौशल, संबंध, नेटवर्क और महत्वाकांक्षाएँ", tone: "kaam" },
  { id: "moksh", label: "मोक्ष", english: "MOKSH", icon: "✧", houses: ["Home & Property", "Research & Transformation", "Inner Growth & Global Reach"], description: "आत्मचिंतन, परिवर्तन और आंतरिक विकास", tone: "moksh" }
];
const TYPES = [
  { id: "article", label: "Article / लेख", icon: "▤" },
  { id: "video", label: "Long Video", icon: "▶" },
  { id: "reel", label: "Reel / Short", icon: "▣" },
  { id: "image", label: "Image / फोटो", icon: "▧" },
  { id: "course", label: "Course / पाठ्यक्रम", icon: "▥" },
  { id: "live", label: "Live Event", icon: "◉" },
  { id: "business", label: "Business Video", icon: "▣" }
];
const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label + " · " + c.english]));
const TYPE_NAMES = Object.fromEntries(TYPES.map(t => [t.id, t.label]));
const formatDate = value => { try { return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

export default function ContentStudio({ auth }) {
  const [category, setCategory] = useState("all");
  const [house, setHouse] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "article", purushartha: "dharma", house: CATEGORIES[0].houses[0], tags: "" });
  const [file, setFile] = useState(null);

  const loadContent = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("purushartha", category);
      if (house !== "all") params.set("house", house);
      if (type !== "all") params.set("type", type);
      if (query.trim()) params.set("q", query.trim());
      if (mine) params.set("mine", "true");
      const response = await fetch(API_BASE + "/api/content?" + params.toString(), { headers: { Authorization: "Bearer " + auth?.token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Content load failed");
      setItems(data.items || []);
      if (category === "all" && house === "all" && type === "all" && !query.trim() && !mine) setAllItems(data.items || []);
      else {
        const statsResponse = await fetch(API_BASE + "/api/content", { headers: { Authorization: "Bearer " + auth?.token } });
        const statsData = await statsResponse.json().catch(() => ({}));
        if (statsResponse.ok) setAllItems(statsData.items || []);
      }
    } catch (e) {
      setError(e.message || "Content API is not available. Check backend deployment.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (auth?.token) loadContent(); }, [auth?.token, category, house, type, query, mine]);

  const counts = useMemo(() => CATEGORIES.map(c => ({ ...c, count: allItems.filter(item => item.purushartha === c.id).length })), [allItems]);
  const activeCategory = CATEGORIES.find(c => c.id === form.purushartha) || CATEGORIES[0];
  const availableHouses = activeCategory.houses;
  const needsVideo = ["video", "reel", "business"].includes(form.type);
  const needsImage = form.type === "image";
  const accept = needsVideo ? "video/mp4,video/webm,video/quicktime" : needsImage ? "image/jpeg,image/png,image/webp,image/gif" : "image/*,video/mp4,video/webm,video/quicktime";

  const changeCategory = id => {
    const next = CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
    setForm(prev => ({ ...prev, purushartha: id, house: next.houses[0] }));
  };
  const publish = async event => {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!form.title.trim()) { setError("Content title is required."); return; }
    if ((needsVideo || needsImage) && !file) { setError(needsVideo ? "Please select a video file." : "Please select an image file."); return; }
    if (file && file.size > 50 * 1024 * 1024) { setError("File size must be 50 MB or less."); return; }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (file) body.append("media", file);
    setPublishing(true);
    try {
      const response = await fetch(API_BASE + "/api/content", { method: "POST", headers: { Authorization: "Bearer " + auth?.token }, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Publishing failed");
      setSuccess("आपका content सफलतापूर्वक publish हो गया।");
      setForm({ title: "", description: "", type: "article", purushartha: category === "all" ? "dharma" : category, house: (CATEGORIES.find(c => c.id === (category === "all" ? "dharma" : category)) || CATEGORIES[0]).houses[0], tags: "" });
      setFile(null);
      const picker = document.getElementById("content-media-file"); if (picker) picker.value = "";
      setCategory("all"); setHouse("all"); setType("all"); setMine(false);
      setShowForm(false);
      await loadContent();
    } catch (e) { setError(e.message || "Publishing failed."); }
    finally { setPublishing(false); }
  };
  const remove = async item => {
    if (!window.confirm("Delete this content permanently?")) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch(API_BASE + "/api/content/" + item._id, { method: "DELETE", headers: { Authorization: "Bearer " + auth?.token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setItems(prev => prev.filter(x => x._id !== item._id));
      setSuccess("Content deleted.");
    } catch (e) { setError(e.message); }
  };

  return <section className="content content-studio">
    <div className="studio-hero">
      <div className="studio-hero-copy">
        <span className="studio-eyebrow">SHIVASHA · FOUR PURUSHARTHAS</span>
        <h2>One platform. <span>Four purposes.</span></h2>
        <p>धर्म, अर्थ, काम और मोक्ष — हर category में articles, videos, Reels, images, courses और business content publish करें।</p>
        <div className="studio-format-pills">{TYPES.map(item => <span key={item.id}>{item.icon} {item.label}</span>)}</div>
        <button type="button" className="studio-publish-hero" onClick={() => { setShowForm(v => !v); setError(""); setSuccess(""); }}>{showForm ? "✕ Close publisher" : "＋ Publish new content"}</button>
      </div>
      <div className="studio-hero-mark" aria-hidden="true"><span>▶</span><i>▤</i><b>SHIVASHA</b><small>WATCH · READ · LEARN · GROW</small></div>
    </div>

    <div className="purushartha-dashboard" aria-label="Four category dashboards">
      {counts.map(c => <button key={c.id} type="button" className={"purushartha-dashboard-card " + c.tone + (category === c.id ? " selected" : "")} onClick={() => { setCategory(category === c.id ? "all" : c.id); setHouse("all"); setMine(false); }}>
        <span className="purushartha-dashboard-icon">{c.icon}</span><span className="purushartha-dashboard-english">{c.english}</span><strong>{c.label}</strong><p>{c.description}</p><small>{c.count} published · {c.houses.length} Houses</small>
      </button>)}
    </div>

    {showForm && <form className="studio-publish-form" onSubmit={publish}>
      <div className="studio-form-heading"><div><span className="studio-eyebrow">CREATOR WORKSPACE</span><h3>Publish to Shivasha</h3><p>Your content will be visible to signed-in users after publishing.</p></div><span className="studio-form-badge">AUTHENTICATED</span></div>
      <div className="studio-form-grid">
        <label>Content title *<input required maxLength="140" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Give your content a clear title"/></label>
        <label>Content type *<select value={form.type} onChange={e => { setForm({ ...form, type: e.target.value }); setFile(null); const picker = document.getElementById("content-media-file"); if (picker) picker.value = ""; }}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label>Main category *<select value={form.purushartha} onChange={e => changeCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label} · {c.english}</option>)}</select></label>
        <label>House subcategory *<select value={form.house} onChange={e => setForm({ ...form, house: e.target.value })}>{availableHouses.map(h => <option key={h} value={h}>{h}</option>)}</select></label>
        <label className="studio-form-wide">Description<textarea rows="4" maxLength="4000" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explain what people will learn, watch or discover..."/></label>
        <label className="studio-form-wide">Tags (comma separated)<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="education, business, meditation"/></label>
        <label className="studio-form-wide studio-file-label">Media file {needsVideo ? "(required · MP4/WEBM/MOV · max 50 MB)" : needsImage ? "(required · JPG/PNG/WEBP/GIF · max 50 MB)" : "(optional · image or video · max 50 MB)"}<input id="content-media-file" type="file" accept={accept} onChange={e => setFile(e.target.files?.[0] || null)}/>{file && <small>Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</small>}</label>
      </div>
      <div className="studio-form-actions"><button type="button" className="studio-reset" onClick={() => { setShowForm(false); setFile(null); setError(""); }}>Cancel</button><button type="submit" className="studio-publish-button" disabled={publishing}>{publishing ? "Uploading & publishing…" : "Publish content"}</button></div>
      <p className="studio-upload-note">Images/videos are uploaded to secure media hosting. Text content is stored in the app database. Publishing media requires the backend Cloudinary settings.</p>
    </form>}

    {error && <div className="studio-alert error" role="alert"><b>Action needed:</b> {error}</div>}
    {success && <div className="studio-alert success" role="status">{success}</div>}

    <div className="studio-toolbar">
      <label className="studio-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, descriptions or tags…" aria-label="Search content"/></label>
      <label className="studio-house-select"><span>Category</span><select value={category} onChange={e => { setCategory(e.target.value); setHouse("all"); }}><option value="all">All four categories</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label} · {c.english}</option>)}</select></label>
      <label className="studio-house-select"><span>House</span><select value={house} onChange={e => setHouse(e.target.value)}><option value="all">All Houses</option>{CATEGORIES.filter(c => category === "all" || c.id === category).flatMap(c => c.houses).map(h => <option key={h}>{h}</option>)}</select></label>
      <label className="studio-house-select"><span>Type</span><select value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
    </div>
    <div className="studio-results-heading"><div><span className="studio-eyebrow">PUBLISHED CONTENT</span><h3>{mine ? "My published content" : category === "all" ? "Discover on Shivasha" : CATEGORY_NAMES[category]}</h3><p>Content saved in the Shivasha database, filtered by your selected category and House.</p></div><div className="studio-heading-actions"><button type="button" className={mine ? "studio-view-toggle selected" : "studio-view-toggle"} onClick={() => setMine(v => !v)}>{mine ? "✓ My content" : "My content"}</button><span className="studio-count">{items.length} items</span></div></div>

    {loading ? <div className="studio-empty"><span>◌</span><h3>Loading published content…</h3></div> : items.length ? <div className="studio-content-grid">{items.map(item => <article className="studio-content-card" key={item._id}>
      <div className={"studio-card-art " + (item.type === "reel" ? "violet" : item.type === "image" ? "orange" : item.type === "course" ? "gold" : item.type === "live" ? "red" : item.type === "business" ? "teal" : item.purushartha)}>
        {item.mediaType === "video" && item.mediaUrl ? <video className="studio-media-preview" src={item.mediaUrl} controls preload="metadata" playsInline/> : item.mediaType === "image" && item.mediaUrl ? <img className="studio-media-preview" src={item.mediaUrl} alt={item.title}/> : <span className="studio-art-icon">{TYPES.find(t => t.id === item.type)?.icon || "✦"}</span>}
        <span className="studio-art-type">{TYPE_NAMES[item.type] || item.type}</span>
      </div>
      <div className="studio-card-body"><div className="studio-card-meta"><span>{CATEGORY_NAMES[item.purushartha]} · {item.house}</span><span>{formatDate(item.createdAt)}</span></div><h4>{item.title}</h4><p>{item.description || "No description provided."}</p><div className="studio-card-footer"><span className="studio-creator"><span className="studio-creator-avatar">{(item.creator?.name || "S").charAt(0).toUpperCase()}</span>{item.creator?.name || "Shivasha Creator"}</span>{item.creator?._id === auth?.user?._id && <button type="button" className="studio-delete-button" onClick={() => remove(item)}>Delete</button>}</div>{item.tags?.length > 0 && <div className="studio-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}</div>
    </article>)}</div> : <div className="studio-empty"><span>▤</span><h3>No published content yet</h3><p>Be the first to publish an article, video, Reel, image or learning resource in this category.</p><button type="button" className="studio-publish-button" onClick={() => setShowForm(true)}>＋ Publish first content</button></div>}
    <p className="studio-footer-note">Content Studio uses the authenticated Shivasha API. Video/image files require Cloudinary credentials on the backend; text publishing requires the API and MongoDB to be online.</p>
  </section>;
}
