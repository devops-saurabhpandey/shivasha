(() => {
  const mount = () => {
    if (document.getElementById("shivasha-founder-entry")) return;
    const style = document.createElement("style");
    style.textContent = `
      #shivasha-founder-entry{position:fixed;right:16px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#111827,#7c3aed);color:#fff;font:600 14px system-ui;box-shadow:0 8px 28px #0003;cursor:pointer}
      #shivasha-founder-overlay{position:fixed;inset:0;z-index:9999;background:#090d18d9;display:none;align-items:center;justify-content:center;padding:18px;overflow:auto}
      #shivasha-founder-card{position:relative;width:min(920px,100%);max-height:94vh;overflow:auto;border-radius:24px;background:#fff;color:#182033;box-shadow:0 24px 90px #0005;display:grid;grid-template-columns:minmax(0, .85fr) minmax(0,1.15fr)}
      #shivasha-founder-card img{width:100%;height:100%;max-height:780px;object-fit:cover;object-position:top;border-radius:24px 0 0 24px;background:#eee}
      #shivasha-founder-copy{padding:30px 28px;align-self:center}
      #shivasha-founder-copy h2{font-size:25px;line-height:1.2;margin:0 0 6px;color:#111827}
      #shivasha-founder-copy .role{color:#7c3aed;font-weight:700;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:18px}
      #shivasha-founder-copy p{font-size:14px;line-height:1.7;margin:0 0 13px}
      #shivasha-founder-copy .values{font-weight:700;color:#6d28d9;margin:16px 0}
      #shivasha-founder-close{position:absolute;right:12px;top:12px;border:0;border-radius:50%;width:38px;height:38px;background:#fff;color:#111827;font-size:24px;box-shadow:0 2px 12px #0002;cursor:pointer}
      @media(max-width:650px){#shivasha-founder-card{display:block;width:min(440px,100%)}#shivasha-founder-card img{display:block;width:100%;height:auto;max-height:48vh;object-fit:cover;object-position:top;border-radius:24px 24px 0 0}#shivasha-founder-copy{padding:22px 20px}#shivasha-founder-copy h2{font-size:22px}}
    `;
    document.head.appendChild(style);
    const button = document.createElement("button");
    button.id = "shivasha-founder-entry";
    button.type = "button";
    button.textContent = "Founder’s Message";
    button.setAttribute("aria-label", "Read SHIVASHA Founder and Chairman message");
    const overlay = document.createElement("div");
    overlay.id = "shivasha-founder-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Founder and Chairman message");
    overlay.innerHTML = `
      <section id="shivasha-founder-card">
        <button id="shivasha-founder-close" type="button" aria-label="Close">×</button>
        <img src="/images/founder-chairman.jpg" alt="SHIVASHA Founder and Chairman poster" />
        <div id="shivasha-founder-copy">
          <div class="role">Founder &amp; Chairman</div>
          <h2>Welcome to SHIVASHA</h2>
          <p>Dear SHIVASHA Family,</p>
          <p>SHIVASHA is built with a vision to connect people through technology, create useful digital opportunities, and make digital experiences more accessible, secure, and transparent.</p>
          <p>We believe lasting success comes from innovation, trust, responsible growth, and real value for our users. Your feedback and confidence inspire us to keep improving.</p>
          <p>Together, let us build a digital future where technology connects people and opens new possibilities.</p>
          <p class="values">Innovation · Trust · Growth</p>
          <p><strong>SHIVASHA PVT LTD</strong><br>Connecting People, Creating Opportunities, Building the Future.</p>
        </div>
      </section>`;
    document.body.append(button, overlay);
    const close = () => { overlay.style.display = "none"; document.body.style.overflow = ""; };
    button.addEventListener("click", () => { overlay.style.display = "flex"; document.body.style.overflow = "hidden"; });
    overlay.querySelector("#shivasha-founder-close").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();