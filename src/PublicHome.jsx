import React, { useMemo, useState } from "react";

const groups = [
  { icon: "🎬", title: "SHIVASHA Social", tag: "CREATE", audience: "For Creators", desc: "Create, publish and grow your audience with social profiles, posts, live content and creator tools.", items: ["Creator profiles & posts", "Live video and content studio", "Creator earnings"], tone: "rose" },
  { icon: "🛍️", title: "SHIVASHA Business Suite", tag: "GROW", audience: "For Business Owners", desc: "A connected place to showcase products, sell online, find customers and manage business operations and software tools.", items: ["E-commerce & product listings", "Business profiles, leads & CRM", "Software, MIS & business tools"], tone: "blue" },
  { icon: "🎓", title: "SHIVASHA Edutech", tag: "LEARN", audience: "For Students", desc: "Learn with school-board resources, books, videos, quizzes and student progress tools.", items: ["CBSE, ICSE & ISC resources", "Books, videos & study material", "Practice tests & progress reports"], tone: "violet" },
  { icon: "📊", title: "SHIVASHA Finance", tag: "PLAN", audience: "For Individuals & Businesses", desc: "Use practical financial, tax, earning and planning tools to make better-informed decisions.", items: ["Tax & finance calculators", "Earning and commission tools", "Business finance resources"], tone: "green" },
  { icon: "🤖", title: "SHIVASHA AI & Wellness", tag: "ASSIST", audience: "For Everyday Guidance", desc: "Explore AI-powered help for everyday business and learning needs, plus general Ayurveda and wellness information.", items: ["AI assistant", "AI business assistance", "Ayurvedic information"], tone: "amber" },
  { icon: "🕉️", title: "SHIVASHA Spiritual & Community", tag: "CONNECT", audience: "For Knowledge & Community", desc: "Explore spiritual learning, daily wisdom, cultural knowledge and community connections.", items: ["Daily wisdom & spiritual learning", "Calendar & knowledge hub", "Community posts & connections"], tone: "slate" },
  { icon: "🎮", title: "SHIVASHA Games", tag: "PLAY", audience: "For Players & Families", desc: "Discover casual games, puzzles and learning games for fun and skill-building.", items: ["Casual games & puzzles", "Educational games", "Family-friendly challenges"], tone: "amber" }
];

const serviceDirectory = [
  { category: "SHIVASHA Social", name: "Creator Profiles & Social Posts", access: "Free", desc: "Build a creator presence, publish posts and connect with your audience." },
  { category: "SHIVASHA Social", name: "Live Video & Content Studio", access: "Free / Premium planned", desc: "Explore live content and creator production tools; any paid features should show pricing before use." },
  { category: "SHIVASHA Social", name: "Audience Growth & Creator Insights", access: "Free / Premium planned", desc: "Explore audience-building guidance and future creator insights." },
  { category: "SHIVASHA Business Suite", name: "E-commerce & Product Listings", access: "Free", desc: "Showcase products and services so potential customers can discover your business." },
  { category: "SHIVASHA Business Suite", name: "Business Profiles & Customer Discovery", access: "Free", desc: "Create a public business presence and receive customer enquiries." },
  { category: "SHIVASHA Business Suite", name: "CRM, MIS & Business Software", access: "Free / Premium planned", desc: "Explore lead tracking, reporting and software tools for business operations." },
  { category: "SHIVASHA Business Suite", name: "E-commerce Storefront", access: "Free", desc: "Showcase products and services for customers to browse and enquire." },
  { category: "SHIVASHA Business Suite", name: "Business Leads & CRM", access: "Free", desc: "Organize business enquiries and customer follow-up workflows." },
  { category: "SHIVASHA Business Suite", name: "Software Tools Directory", access: "Free", desc: "Discover software and practical tools for business operations." },
  { category: "SHIVASHA Edutech", name: "CBSE / ICSE / ISC Resources", access: "Free", desc: "Browse school-board learning resources, books, videos and study support." },
  { category: "SHIVASHA Edutech", name: "Class → Subject → Books & Videos", access: "Free", desc: "Organize learning resources by class and subject, with related books, videos and study material." },
  { category: "SHIVASHA Edutech", name: "Practice Tests & Student Progress", access: "Free", desc: "Practise quizzes, review saved results and track subject or chapter progress." },
  { category: "SHIVASHA Finance", name: "Tax & Finance Calculators", access: "Free", desc: "Use practical calculators for estimates and planning; verify important decisions independently." },
  { category: "SHIVASHA Finance", name: "Earning & Commission Tools", access: "Free", desc: "Explore earning calculators and commission-planning resources." },
  { category: "SHIVASHA Finance", name: "Tax & Compliance Information", access: "Free", desc: "Find general information about PAN, GST and business tax compliance; confirm requirements with official sources or a qualified professional." },
  { category: "SHIVASHA Finance", name: "Business Finance & Cash Flow", access: "Free", desc: "Organize business income, expenses, cash-flow estimates and basic financial planning." },
  { category: "SHIVASHA AI & Wellness", name: "AI Business Assistance", access: "Free", desc: "Get guided information for common business questions." },
  { category: "SHIVASHA AI & Wellness", name: "AI Education Help", access: "Free", desc: "Get learning support for concepts, study planning and practice questions; verify important academic information." },
  { category: "SHIVASHA AI & Wellness", name: "Ayurvedic Information Assistant", access: "Free", desc: "Explore general Ayurveda and wellness information, not a diagnosis or treatment plan." },
  { category: "SHIVASHA AI & Wellness", name: "Wellness & Lifestyle Guidance", access: "Free", desc: "Explore general information about healthy routines, sleep, hydration and balanced lifestyle habits." },
  { category: "SHIVASHA Spiritual & Community", name: "Spiritual Learning & Self-Knowledge", access: "Free", desc: "Explore spiritual topics, self-reflection and knowledge resources for personal learning." },
  { category: "SHIVASHA Spiritual & Community", name: "Daily Wisdom & Reflections", access: "Free", desc: "Read daily reflections and prompts for thoughtful self-development." },
  { category: "SHIVASHA Spiritual & Community", name: "Calendar & Cultural Knowledge", access: "Free", desc: "Explore cultural calendar information and general knowledge resources." },
  { category: "SHIVASHA Spiritual & Community", name: "Community Posts & Connections", access: "Free", desc: "Discover community sharing features and connect around shared interests." },
  { category: "SHIVASHA Games", name: "Casual Games & Puzzles", access: "Free", desc: "Play simple casual games and puzzles for entertainment." },
  { category: "SHIVASHA Games", name: "Educational Games", access: "Free", desc: "Explore learning-focused games that support practice and problem-solving." },
  { category: "SHIVASHA Games", name: "Family-Friendly Challenges", access: "Free", desc: "Discover approachable challenges designed for general audiences and family play." }
];

function createGameDeck() {
  const symbols = ["🌟", "🚀", "🎯", "🧩", "🎮", "🌈", "⚽", "🎨"];
  return [...symbols, ...symbols].sort(() => Math.random() - 0.5).map((symbol, index) => ({ id: `${Date.now()}-${index}-${Math.random()}`, symbol }));
}

export default function PublicHome({ onGetStarted, onLogin }) {
  const [search, setSearch] = useState("");
  const [gameDeck, setGameDeck] = useState(createGameDeck);
  const [gameOpen, setGameOpen] = useState([]);
  const [gameMatched, setGameMatched] = useState([]);
  const [gameMoves, setGameMoves] = useState(0);
  const resetGame = () => { setGameDeck(createGameDeck()); setGameOpen([]); setGameMatched([]); setGameMoves(0); };
  const flipGameCard = (index) => {
    if (gameMatched.includes(index) || gameOpen.includes(index) || gameOpen.length === 2) return;
    const next = [...gameOpen, index];
    setGameOpen(next);
    if (next.length === 2) {
      setGameMoves(moves => moves + 1);
      if (gameDeck[next[0]].symbol === gameDeck[next[1]].symbol) {
        setGameMatched(matched => [...matched, ...next]);
        setGameOpen([]);
      } else {
        window.setTimeout(() => setGameOpen([]), 750);
      }
    }
  };
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...groups.map(g => g.title)];
  const filteredGroups = useMemo(() => groups.filter(g => (activeCategory === "All" || g.title === activeCategory) && (g.title + " " + g.desc + " " + g.items.join(" ")).toLowerCase().includes(search.toLowerCase().trim())), [activeCategory, search]);
  const filteredServices = useMemo(() => serviceDirectory.filter(s => (activeCategory === "All" || s.category === activeCategory) && (s.category + " " + s.name + " " + s.desc + " " + s.access).toLowerCase().includes(search.toLowerCase().trim())), [activeCategory, search]);
  return <div className="sh-public">
    <style>{`
      .sh-public{--ink:#15233b;--muted:#66758b;--line:#e5eaf2;min-height:100vh;background:#f7f9fc;color:var(--ink);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .sh-wrap{width:min(1160px,calc(100% - 40px));margin:auto}
      .sh-nav{height:78px;display:flex;align-items:center;justify-content:space-between;gap:20px}
      .sh-brand{display:flex;align-items:center;gap:11px;font-weight:900;letter-spacing:1.2px;font-size:19px}
      .sh-mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#172b4d;color:white;font-size:23px;box-shadow:0 8px 18px #172b4d22}
      .sh-links{display:flex;gap:24px;align-items:center;color:#53627a;font-size:13px;font-weight:700}
      .sh-links a{color:inherit;text-decoration:none}
      .sh-btn{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer;font-size:13px}
      .sh-btn-dark{background:#172b4d;color:#fff;box-shadow:0 8px 18px #172b4d22}
      .sh-btn-light{background:#fff;color:#172b4d;border:1px solid var(--line)}
      .sh-hero{position:relative;overflow:hidden;margin:20px auto 58px;border-radius:30px;background:linear-gradient(115deg,#10203d 0%,#183b65 58%,#246a83 100%);color:white;padding:68px 7%;min-height:390px;display:flex;align-items:center}
      .sh-hero:before,.sh-hero:after{content:"";position:absolute;border-radius:50%;border:1px solid #ffffff18;pointer-events:none}
      .sh-hero:before{width:440px;height:440px;right:-60px;top:-170px;box-shadow:0 0 0 45px #ffffff08,0 0 0 90px #ffffff05}
      .sh-hero:after{width:260px;height:260px;right:90px;bottom:-190px;background:#50d9c514}
      .sh-hero-content{max-width:650px;position:relative;z-index:1}
      .sh-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #ffffff35;background:#ffffff12;padding:8px 12px;border-radius:30px;font-size:11px;letter-spacing:1.3px;font-weight:800;color:#c6f5ed}
      .sh-hero h1{font-size:clamp(36px,5.3vw,64px);line-height:1.04;letter-spacing:-2px;margin:22px 0 18px}
      .sh-hero h1 span{color:#7ce2d2}
      .sh-hero p{max-width:570px;color:#d8e4f2;font-size:16px;line-height:1.8;margin:0 0 27px}
      .sh-hero-actions{display:flex;flex-wrap:wrap;gap:12px}
      .sh-hero .sh-btn-light{background:#ffffff;color:#17324f;border:0}
      .sh-trust{display:flex;flex-wrap:wrap;gap:24px;margin-top:30px;color:#c3d2e4;font-size:12px}
      .sh-trust b{color:white}
      .sh-section-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}
      .sh-kicker{color:#187e79;font-size:11px;letter-spacing:1.6px;font-weight:900}
      .sh-section-head h2{font-size:clamp(26px,3vw,38px);letter-spacing:-1px;margin:8px 0}
      .sh-section-head p{color:var(--muted);margin:0;line-height:1.65;max-width:530px;font-size:14px}
      .sh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}
      .sh-card{border:1px solid var(--line);background:#fff;border-radius:20px;padding:23px;min-height:245px;transition:transform .2s,box-shadow .2s}
      .sh-card:hover{transform:translateY(-4px);box-shadow:0 16px 36px #1c31500e}
      .sh-discovery{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;margin:22px 0 18px}
      .sh-game-panel{margin:44px 0;padding:28px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(135deg,#fff,#f0f8ff)}
      .sh-game-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:440px;margin:22px auto}
      .sh-game-tile{aspect-ratio:1;border:1px solid #dbe5f2;border-radius:15px;background:#17324f;color:#fff;font-size:clamp(22px,4vw,34px);cursor:pointer;box-shadow:0 4px 10px #17324f12}
      .sh-game-tile[aria-pressed="true"]{background:#fff;color:#172b4d;border-color:#8accc6}
      .sh-game-stats{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:13px;font-weight:800}
      .sh-game-status{text-align:center;min-height:24px;font-weight:800;color:#187e79}
      .sh-search{width:100%;min-width:0;border:1px solid #dce4ef;background:#fff;border-radius:13px;padding:14px 16px;font:inherit;font-size:14px;color:var(--ink);outline:none}
      .sh-search:focus{border-color:#328b91;box-shadow:0 0 0 3px #328b9118}
      .sh-filter{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
      .sh-filter button{border:1px solid #dce4ef;background:#fff;color:#53627a;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:800;cursor:pointer}
      .sh-filter button[aria-pressed="true"]{background:#172b4d;border-color:#172b4d;color:#fff}
      .sh-card{display:flex;flex-direction:column}
      .sh-card .sh-items{margin-top:auto;padding-top:14px}
      .sh-card-action{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid #edf1f6}
      .sh-card-action button{background:transparent;border:0;color:#167c7a;font-size:12px;font-weight:900;cursor:pointer;padding:4px 0}
      .sh-service-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}
      .sh-service{background:#fff;border:1px solid var(--line);border-radius:15px;padding:17px}
      .sh-service-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
      .sh-service h3{font-size:14px;margin:0}
      .sh-service p{font-size:12px;line-height:1.7;color:var(--muted);margin:0 0 12px}
      .sh-access{font-size:10px;font-weight:900;border-radius:7px;padding:6px 8px;background:#e4f8ef;color:#18744b;white-space:nowrap}
      .sh-access.planned{background:#fff2d9;color:#865800}
      .sh-empty{background:white;border:1px dashed #cbd5e1;border-radius:16px;padding:24px;color:var(--muted);font-size:13px;grid-column:1/-1}
      .sh-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
      .sh-icon{width:49px;height:49px;display:grid;place-items:center;border-radius:15px;font-size:24px}
      .sh-tag{font-size:10px;font-weight:900;letter-spacing:1.1px;color:#7c8798}
      .sh-card h3{font-size:19px;margin:0 0 9px}
      .sh-card p{color:var(--muted);font-size:13px;line-height:1.7;margin:0 0 15px}
      .sh-items{display:flex;flex-wrap:wrap;gap:7px}
      .sh-items span{background:#f2f5f9;color:#53627a;border-radius:7px;padding:6px 8px;font-size:10px;font-weight:700}
      .sh-blue .sh-icon{background:#e8f1ff}.sh-violet .sh-icon{background:#f0eaff}.sh-green .sh-icon{background:#e4f8ef}.sh-amber .sh-icon{background:#fff2d9}.sh-rose .sh-icon{background:#ffe9ee}.sh-slate .sh-icon{background:#e9eff5}
      .sh-plans{margin:62px 0;background:#edf3fa;border:1px solid #e0e8f2;border-radius:24px;padding:34px}
      .sh-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
      .sh-plan{background:white;border:1px solid #e0e8f2;border-radius:16px;padding:22px;display:flex;gap:15px}
      .sh-plan-mark{font-size:24px}
      .sh-plan h3{margin:0 0 7px;font-size:17px}.sh-plan p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}
      .sh-note{font-size:11px;color:#718096;margin-top:14px;line-height:1.6}
      .sh-bottom{margin:0 0 34px;border-radius:22px;background:#142846;color:white;padding:30px 34px;display:flex;align-items:center;justify-content:space-between;gap:20px}
      .sh-bottom h2{font-size:25px;margin:0 0 8px}.sh-bottom p{color:#c6d3e3;font-size:13px;margin:0;line-height:1.7}
      .sh-footer{border-top:1px solid var(--line);padding:22px 0 28px;display:flex;justify-content:space-between;gap:16px;color:#718096;font-size:11px}
      @media(max-width:800px){.sh-links a:not(.sh-keep){display:none}.sh-hero{padding:45px 26px;min-height:0;margin-top:8px}.sh-hero h1{letter-spacing:-1.2px}.sh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sh-section-head{align-items:start;flex-direction:column}.sh-bottom{align-items:flex-start;flex-direction:column}}
      @media(max-width:650px){.sh-discovery{grid-template-columns:1fr}.sh-service-list{grid-template-columns:1fr}}
      @media(max-width:540px){.sh-wrap{width:calc(100% - 24px)}.sh-nav{height:68px}.sh-brand{font-size:16px}.sh-mark{width:37px;height:37px}.sh-links{gap:8px}.sh-links .sh-btn{padding:10px 12px}.sh-hero{border-radius:22px;padding:36px 22px}.sh-hero p{font-size:14px}.sh-trust{gap:12px}.sh-grid,.sh-plan-grid{grid-template-columns:1fr}.sh-card{min-height:0}.sh-plans{padding:22px;margin:42px 0}.sh-bottom{padding:25px 22px}.sh-footer{flex-direction:column}}
    `}</style>
    <header className="sh-wrap sh-nav">
      <div className="sh-brand"><div className="sh-mark">शि</div><span>SHIVASHA</span></div>
      <nav className="sh-links" aria-label="Main navigation"><a href="#services">Services</a><a href="#plans">Free & Premium</a><a href="#about">About</a><button className="sh-btn sh-btn-dark" onClick={onLogin}>Login / Join</button></nav>
    </header>
    <main className="sh-wrap">
      <section className="sh-hero">
        <div className="sh-hero-content">
          <div className="sh-eyebrow">✦ YOUR EVERYDAY DIGITAL PLATFORM</div>
          <h1>One platform.<br/><span>More possibilities.</span></h1>
          <p>Discover businesses, learn new skills, explore practical tools and connect with a community built around knowledge, growth and wellbeing.</p>
          <div className="sh-hero-actions"><button className="sh-btn sh-btn-light" onClick={onGetStarted}>Explore Shivasha&nbsp; ↗</button><button className="sh-btn" style={{background:"#ffffff16",color:"#fff",border:"1px solid #ffffff42"}} onClick={onLogin}>Sign in / Create account</button></div>
          <div className="sh-trust"><span>✓ <b>Business tools</b></span><span>✓ <b>Learning resources</b></span><span>✓ <b>AI-assisted guidance</b></span></div>
        </div>
      </section>
      <section id="services" style={{paddingBottom:8}}>
        <div className="sh-section-head"><div><div className="sh-kicker">EXPLORE SHIVASHA</div><h2>Everything starts with a category.</h2></div><p>Move between practical services and discovery areas from one simple, mobile-friendly platform.</p></div>
        <div className="sh-discovery">
          <input className="sh-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search business, books, finance, Ayurveda…" aria-label="Search Shivasha services" />
          <button className="sh-btn sh-btn-dark" onClick={()=>{document.getElementById("directory")?.scrollIntoView({behavior:"smooth"})}}>Find services</button>
        </div>
        <div className="sh-filter" role="group" aria-label="Filter by category">{categories.map(category=><button key={category} type="button" aria-pressed={activeCategory===category} onClick={()=>setActiveCategory(category)}>{category}</button>)}</div>
        <div className="sh-grid">{filteredGroups.map(g=><article className={"sh-card sh-"+g.tone} key={g.title}><div className="sh-card-top"><div className="sh-icon">{g.icon}</div><span className="sh-tag">{g.tag}</span></div><h3>{g.title}</h3><p style={{margin:"-4px 0 10px",fontSize:12,fontWeight:800,color:"#187e79"}}>{g.audience}</p><p>{g.desc}</p><div className="sh-items">{g.items.map(x=><span key={x}>{x}</span>)}</div><div className="sh-card-action"><span style={{fontSize:11,color:"#718096"}}>{serviceDirectory.filter(s=>s.category===g.title).length} services</span><button type="button" onClick={()=>{setActiveCategory(g.title);setShowDirectory(true);document.getElementById("directory")?.scrollIntoView({behavior:"smooth"})}}>Explore category →</button></div></article>)}
          {!filteredGroups.length&&<div className="sh-empty">No category matches “{search}”. Try another keyword or choose All.</div>}</div>
      </section>
      <section id="directory" style={{paddingTop:44,scrollMarginTop:24}}>
        <div className="sh-section-head"><div><div className="sh-kicker">SERVICE DIRECTORY</div><h2>{activeCategory==="All"?"Browse available services":activeCategory+" services"}</h2></div><p>Choose a service to see its current access status. Sign in to open the account-based features.</p></div>
        <div className="sh-service-list">{filteredServices.map(s=><article className="sh-service" key={s.category+s.name}><div className="sh-service-top"><h3>{s.name}</h3><span className={"sh-access"+(s.access!=="Free"?" planned":"")}>{s.access}</span></div><p>{s.desc}</p><button className="sh-btn sh-btn-light" onClick={onLogin}>Sign in to explore ↗</button></article>)}
          {!filteredServices.length&&<div className="sh-empty">No services found for this search. Clear the search or select All.</div>}</div>
        <p className="sh-note">“Premium planned” indicates a possible future offering only; paid subscriptions or payments are not activated by this label.</p>
      </section>
      <section id="games" className="sh-game-panel">
        <div className="sh-section-head"><div><div className="sh-kicker">SHIVASHA GAMES · PLAY NOW</div><h2>Memory Match Challenge</h2></div><p>Find all eight matching emoji pairs. This simple game works in your browser and does not need an account.</p></div>
        <div className="sh-game-stats"><span>Moves: {gameMoves}</span><span>Pairs: {gameMatched.length / 2} / 8</span></div>
        <div className="sh-game-board" aria-label="Memory matching game board">{gameDeck.map((card, index) => { const revealed = gameOpen.includes(index) || gameMatched.includes(index); return <button key={card.id} type="button" className="sh-game-tile" aria-label={revealed ? `Card ${index + 1}: ${card.symbol}` : `Reveal card ${index + 1}`} aria-pressed={revealed} onClick={() => flipGameCard(index)}>{revealed ? card.symbol : "?"}</button>; })}</div>
        <p className="sh-game-status" role="status">{gameMatched.length === gameDeck.length ? `Great job! You matched all pairs in ${gameMoves} moves.` : "Turn over two cards at a time and remember their positions."}</p>
        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}><button type="button" className="sh-btn sh-btn-dark" onClick={resetGame}>Restart game ↻</button></div>
      </section>
      <section id="plans" className="sh-plans">
        <div className="sh-kicker">CHOOSE YOUR ACCESS</div><h2 style={{fontSize:30,letterSpacing:"-1px",margin:"8px 0"}}>Start free. Upgrade when you need more.</h2><p style={{color:"#66758b",fontSize:13,lineHeight:1.7,maxWidth:680,margin:0}}>Services will be clearly marked so you can understand what is available at no cost and which features may require a premium plan.</p>
        <div className="sh-plan-grid"><div className="sh-plan"><div className="sh-plan-mark">🌱</div><div><h3>Free services</h3><p>Explore available community features, selected learning resources, basic tools and introductory information.</p></div></div><div className="sh-plan"><div className="sh-plan-mark">💎</div><div><h3>Premium services</h3><p>Advanced features may be offered through a paid plan when they are ready and clearly described.</p></div></div></div>
        <div className="sh-note">Availability varies by module. Premium labels on this preview do not mean payments or subscriptions are active. Health and Ayurvedic content is informational and does not replace professional medical care.</div>
      </section>
      <section id="about" className="sh-bottom"><div><h2>Build, learn and grow with Shivasha.</h2><p>A connected platform for business discovery, education, practical tools and community.</p></div><button className="sh-btn sh-btn-light" onClick={onGetStarted}>Get started&nbsp; →</button></section>
    </main>
    <footer className="sh-wrap sh-footer"><span>© {new Date().getFullYear()} SHIVASHA</span><span>Social · Connect · Share</span></footer>
  </div>;
}
