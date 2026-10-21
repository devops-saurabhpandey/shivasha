import React from "react";

const groups = [
  { icon: "🏢", title: "Business", tag: "GROW", desc: "Find customers, showcase products, manage leads and grow your business.", items: ["Business profiles", "Customer discovery", "CRM & MIS tools"], tone: "blue" },
  { icon: "📚", title: "Education", tag: "LEARN", desc: "Explore learning resources, school boards, books and educational content.", items: ["CBSE & ICSE resources", "Books & learning", "Educational videos"], tone: "violet" },
  { icon: "📈", title: "Finance", tag: "PLAN", desc: "Use practical calculators and tools to make better-informed decisions.", items: ["Financial calculators", "Business tools", "Earning resources"], tone: "green" },
  { icon: "🤖", title: "AI & Wellness", tag: "DISCOVER", desc: "Get guided information and explore AI-powered assistance responsibly.", items: ["AI assistant", "Ayurvedic information", "Wellness guidance"], tone: "amber" },
  { icon: "🕉️", title: "Spirituality", tag: "EXPLORE", desc: "Discover spiritual knowledge, daily wisdom and self-development resources.", items: ["Daily wisdom", "Purushartha learning", "Spiritual resources"], tone: "rose" },
  { icon: "💬", title: "Community", tag: "CONNECT", desc: "Connect with people, share ideas and discover useful content.", items: ["Community posts", "Creator content", "Messages & connections"], tone: "slate" }
];

export default function PublicHome({ onGetStarted, onLogin }) {
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
        <div className="sh-grid">{groups.map(g=><article className={"sh-card sh-"+g.tone} key={g.title}><div className="sh-card-top"><div className="sh-icon">{g.icon}</div><span className="sh-tag">{g.tag}</span></div><h3>{g.title}</h3><p>{g.desc}</p><div className="sh-items">{g.items.map(x=><span key={x}>{x}</span>)}</div></article>)}</div>
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
