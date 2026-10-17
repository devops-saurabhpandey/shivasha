import React, { useMemo, useState } from "react";
import "./content-studio.css";

const TYPES = [
  { id: "all", label: "All content", icon: "✦" },
  { id: "video", label: "Long videos", icon: "▶" },
  { id: "reel", label: "Reels & Shorts", icon: "▣" },
  { id: "article", label: "Articles", icon: "▤" },
  { id: "image", label: "Images", icon: "▧" },
  { id: "course", label: "Courses", icon: "▥" },
  { id: "live", label: "Live events", icon: "◉" },
  { id: "business", label: "Business videos", icon: "▣" }
];

const HOUSES = [
  "All 12 Houses", "Self & Identity", "Wealth & Finance", "Skills & Communication",
  "Home & Property", "Education & Creativity", "Services & Wellbeing",
  "Business & Partnerships", "Research & Transformation", "Knowledge & Philosophy",
  "Career & Profession", "Networks & Growth", "Inner Growth & Global Reach"
];

const EXAMPLES = [
  { id: 1, type: "video", house: "Skills & Communication", title: "Web Development: From Basics to Projects", creator: "Shivasha Learning", description: "Long-form tutorial series for people learning modern web development.", duration: "18 min", icon: "▶", tone: "blue", tags: ["Coding", "Tutorial"] },
  { id: 2, type: "reel", house: "Education & Creativity", title: "One concept in 60 seconds", creator: "Creator Studio", description: "A short vertical-video format for quick lessons and useful ideas.", duration: "0:58", icon: "▣", tone: "violet", tags: ["Shorts", "Learning"] },
  { id: 3, type: "article", house: "Research & Transformation", title: "How AI discovery can help people find the right service", creator: "Shivasha Editorial", description: "An article format with readable text, tags, author details and related content.", duration: "6 min read", icon: "▤", tone: "green", tags: ["AI", "Discovery"] },
  { id: 4, type: "image", house: "Self & Identity", title: "Creator portfolio and visual story", creator: "Community Creators", description: "Image posts and galleries with captions, attribution and accessible alt text.", duration: "Gallery", icon: "▧", tone: "orange", tags: ["Images", "Creator"] },
  { id: 5, type: "course", house: "Education & Creativity", title: "Practical Software Skills", creator: "Shivasha Edutech", description: "A course structure with lessons, progress tracking, quizzes and learning resources.", duration: "8 lessons", icon: "▥", tone: "gold", tags: ["Course", "Skills"] },
  { id: 6, type: "live", house: "Networks & Growth", title: "Community webinar and Q&A", creator: "Shivasha Community", description: "Planned live-event experience with scheduled sessions, chat and replay support.", duration: "Scheduled", icon: "◉", tone: "red", tags: ["Live", "Community"] },
  { id: 7, type: "business", house: "Business & Partnerships", title: "Product demo and customer inquiry", creator: "Shivasha Business", description: "Business product videos connected to a company profile, catalogue and inquiry form.", duration: "Product demo", icon: "▣", tone: "teal", tags: ["Business", "Leads"] },
  { id: 8, type: "video", house: "Knowledge & Philosophy", title: "Knowledge, philosophy and reflection", creator: "Knowledge Library", description: "A long-form video library organized by topics, creators and playlists.", duration: "12 min", icon: "▶", tone: "indigo", tags: ["Knowledge", "Library"] }
];

const TYPE_NAMES = Object.fromEntries(TYPES.map(type => [type.id, type.label]));

export default function ContentStudio() {
  const [type, setType] = useState("all");
  const [house, setHouse] = useState("All 12 Houses");
  const [query, setQuery] = useState("");
  const [showPublishingPlan, setShowPublishingPlan] = useState(false);

  const items = useMemo(() => EXAMPLES.filter(item => {
    const typeMatch = type === "all" || item.type === type;
    const houseMatch = house === "All 12 Houses" || item.house === house;
    const text = (item.title + " " + item.creator + " " + item.description + " " + item.tags.join(" ")).toLowerCase();
    return typeMatch && houseMatch && text.includes(query.trim().toLowerCase());
  }), [type, house, query]);

  return <section className="content content-studio">
    <div className="studio-hero">
      <div className="studio-hero-copy">
        <span className="studio-eyebrow">SHIVASHA · UNIFIED CONTENT PLATFORM</span>
        <h2>One place for <span>every format.</span></h2>
        <p>Long videos, Reels, articles, images, courses, live events and business product videos — organized across the 12 Houses.</p>
        <div className="studio-format-pills">{TYPES.slice(1).map(item => <span key={item.id}>{item.icon} {item.label}</span>)}</div>
      </div>
      <div className="studio-hero-mark" aria-hidden="true"><span>▶</span><i>▤</i><b>SHIVASHA</b><small>WATCH · READ · LEARN · GROW</small></div>
    </div>

    <div className="studio-notice"><b>Prototype preview:</b> These cards demonstrate the planned content experience. Publishing, persistent media uploads, course progress and live streaming need backend, storage and provider integration before they can work for real users.</div>

    <div className="studio-toolbar">
      <label className="studio-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search content, creators or topics…" aria-label="Search content" /></label>
      <label className="studio-house-select"><span>House</span><select value={house} onChange={e => setHouse(e.target.value)} aria-label="Filter by house">{HOUSES.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>

    <div className="studio-type-tabs" role="tablist" aria-label="Content type filters">
      {TYPES.map(item => <button type="button" key={item.id} role="tab" aria-selected={type === item.id} className={type === item.id ? "studio-type-tab selected" : "studio-type-tab"} onClick={() => setType(item.id)}><span>{item.icon}</span>{item.label}</button>)}
    </div>

    <div className="studio-results-heading"><div><span className="studio-eyebrow">EXPLORE CONTENT</span><h3>{type === "all" ? "Discover on Shivasha" : TYPE_NAMES[type]}</h3><p>{house === "All 12 Houses" ? "Content from across the 12 Houses" : house}</p></div><span className="studio-count">{items.length} preview {items.length === 1 ? "item" : "items"}</span></div>

    {items.length ? <div className="studio-content-grid">{items.map(item => <article className="studio-content-card" key={item.id}>
      <div className={"studio-card-art " + item.tone}><span className="studio-art-icon">{item.icon}</span><span className="studio-art-type">{TYPE_NAMES[item.type]}</span>{item.type === "live" && <span className="studio-live-label">LIVE FORMAT</span>}<span className="studio-art-watermark">S</span></div>
      <div className="studio-card-body"><div className="studio-card-meta"><span>{item.house}</span><span>{item.duration}</span></div><h4>{item.title}</h4><p>{item.description}</p><div className="studio-card-footer"><span className="studio-creator"><span className="studio-creator-avatar">{item.creator.charAt(0)}</span>{item.creator}</span><span className="studio-preview-label">Example</span></div><div className="studio-tags">{item.tags.map(tag => <span key={tag}>#{tag.replace(/\s+/g, "")}</span>)}</div></div>
    </article>)}</div> : <div className="studio-empty"><span>⌕</span><h3>No matching preview content</h3><p>Try another content type, House or search term.</p><button type="button" className="studio-reset" onClick={() => { setType("all"); setHouse("All 12 Houses"); setQuery(""); }}>Reset filters</button></div>}

    <section className="studio-roadmap">
      <button type="button" className="studio-roadmap-toggle" aria-expanded={showPublishingPlan} onClick={() => setShowPublishingPlan(value => !value)}><span><span className="studio-eyebrow">NEXT IMPLEMENTATION STEP</span><strong>What is needed to make publishing real?</strong><small>Review the backend and media roadmap</small></span><span>{showPublishingPlan ? "−" : "+"}</span></button>
      {showPublishingPlan && <div className="studio-roadmap-list">
        <article><b>1. Shared content API</b><p>Store content metadata, creator, House, format, visibility and publication state in the database.</p></article>
        <article><b>2. Secure media storage</b><p>Upload images and videos to object storage or a video platform; keep file URLs and processing status in the database.</p></article>
        <article><b>3. Creator publishing tools</b><p>Add drafts, previews, thumbnails, captions, alt text, categories and publish controls.</p></article>
        <article><b>4. Format-specific features</b><p>Build video playback, vertical Reels, course lessons and progress, business inquiries, and live-stream provider integration.</p></article>
        <article><b>5. Trust, safety and scale</b><p>Add reporting, moderation, access permissions, quotas, transcoding, analytics and accessibility checks.</p></article>
      </div>}
    </section>
  </section>;
}
