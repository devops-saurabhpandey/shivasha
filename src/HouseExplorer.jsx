import React, { useMemo, useState } from "react";
import "./house-explorer.css";

const HOUSES = [
  { purushartha: "dharma", number: 1, name: "Self & Identity", hindi: "प्रथम भाव", color: "red", symbol: "◉", purpose: "Personal identity, profiles and self-development.", modules: ["M1 · Shivasha Social"], features: ["Digital identity and profiles", "Personal branding", "Social feed and connections"], phase: "Phase 1 · Foundation" },
  { purushartha: "artha", number: 2, name: "Wealth & Finance", hindi: "द्वितीय भाव", color: "orange", symbol: "₹", purpose: "Financial tools, commerce and responsible payments.", modules: ["M4 · Marketplace", "M7 · Payments", "M12 · Business OS"], features: ["Product and service catalogues", "Invoices and finance tools", "Payment gateway integrations"], phase: "Phase 4 · Commerce" },
  { purushartha: "kaam", number: 3, name: "Skills & Communication", hindi: "तृतीय भाव", color: "yellow", symbol: "⌘", purpose: "Skills, communication and software creation.", modules: ["M9 · Developers", "M10 · Software Solutions"], features: ["Messaging and communication", "Developer APIs and SDKs", "Custom software services"], phase: "Phases 1, 5 · Foundation & Developer Platform" },
  { purushartha: "moksh", number: 4, name: "Home & Property", hindi: "चतुर्थ भाव", color: "green", symbol: "⌂", purpose: "Home, property and local needs.", modules: ["M6 · Services"], features: ["Property listings", "Home-service discovery", "Property management tools"], phase: "Phase 4 · Services" },
  { purushartha: "dharma", number: 5, name: "Education & Creativity", hindi: "पंचम भाव", color: "blue", symbol: "✦", purpose: "Learning, creative work and knowledge sharing.", modules: ["M11 · Edutech", "M14 · Creator Platform"], features: ["Courses and learning paths", "Creator profiles and publishing", "Creative AI assistance"], phase: "Phase 3 · AI & Education" },
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

export default function HouseExplorer() {
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
      <div className="house-wheel" aria-label="Twelve house subcategories">
        {HOUSES.map(h => <button key={h.number} type="button" className={selected === h.number ? "wheel-segment selected" : "wheel-segment"} onClick={() => setSelected(h.number)} title={h.name}><span>{h.number}</span><small>{h.symbol}</small></button>)}
        <div className="wheel-center"><b>S</b><small>SHIVASHA</small></div>
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

    <section className="phase-roadmap">
      <button className="phase-toggle" type="button" onClick={() => setShowPhases(v => !v)} aria-expanded={showPhases}><span><span className="house-kicker">DELIVERY PLAN</span><strong>7 Development Phases</strong><small>Expand the staged roadmap</small></span><span className="phase-toggle-icon">{showPhases ? "−" : "+"}</span></button>
      {showPhases && <div className="phase-list">{PHASES.map(([n, title, description]) => <article className="phase-item" key={n}><span className="phase-number">{n}</span><div><h3>Phase {n} · {title}</h3><p>{description}</p></div></article>)}</div>}
    </section>
    <p className="house-disclaimer">The four Purusharthas are the primary categories. The 12 houses are grouped using the traditional Jyotish purpose mapping: Dharma (1, 5, 9), Artha (2, 6, 10), Kaam (3, 7, 11), Moksh (4, 8, 12). The digital product mapping is a modern organization of Shivasha features.</p>
  </section>;
}
