import React, { useEffect, useState } from "react";
import { SHIVASHA_APPS } from "./config/productNavigation.js";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const APP_LINKS = [
  ["Social", "https://social.shivasha.com"],
  ["Business", "https://business.shivasha.com"],
  ["Edutech", "https://edutech.shivasha.com"],
  ["Enterprise", "https://enterprise.shivasha.com"]
];

const featureLabels = {
  "business-platform": "Business growth platform",
  "sales-agent": "AI sales agent",
  "ad-network": "Advertising network",
  crm: "Customer relationship management",
  ecommerce: "Products and services marketplace",
  marketing: "Marketing tools",
  "customer-finder": "Customer discovery",
  "visitors-attractor": "Visitor attraction tools",
  "ui-ux-designer": "UI/UX design tools",
  "software-hub": "Software directory",
  "affiliate-center": "Affiliate partner centre",
  houses: "Education and knowledge",
  science: "Science learning",
  technology: "Technology learning",
  "current-affairs": "Current affairs",
  "global-education": "Global education",
  "learning-academy": "Learning academy",
  wisdom: "Daily wisdom",
  "japanese-wisdom": "Japanese wisdom",
  "daily-dev-stuti": "Daily Dev Stuti",
  motivation: "Daily motivation",
  "pooja-book": "Pooja book",
  "hindu-calendar": "Hindu calendar",
  "government-schemes": "Government schemes and knowledge",
  "ayurveda-ai": "Ayurveda AI",
  "astro-career": "Career guidance",
  hr: "HR and people management",
  mis: "MIS reports",
  admin: "Company administration",
  "tax-calculators": "Tax and professional calculators",
  "money-management": "Money management"
};

export default function ProductPortal({ productId }) {
  const product = SHIVASHA_APPS[productId];
  const [session, setSession] = useState(null);
  const [sessionState, setSessionState] = useState("checking");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(API_BASE + "/api/auth/session", { credentials: "include" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "No active session");
        return data;
      })
      .then(data => {
        if (!active) return;
        setSession(data);
        setSessionState("signed-in");
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setSessionState("signed-out");
      });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    setLogoutError("");
    try {
      const response = await fetch(API_BASE + "/api/auth/logout", { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Sign out failed");
      setSession(null);
      setSessionState("signed-out");
    } catch (error) {
      setLogoutError(error.message || "Could not sign out. Please try again.");
    }
  };

  if (!product) return <main className="content narrow"><section className="panel"><h1>Unknown Shivasha application</h1><a href="./index.html">Open Shivasha</a></section></main>;

  return <main style={{ minHeight: "100vh", padding: "clamp(20px, 5vw, 64px)", background: "var(--background, #f5f7fb)", color: "var(--text, #172033)" }}>
    <section style={{ maxWidth: 920, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".12em", fontWeight: 800, opacity: .7 }}>SHIVASHA · FOUR APPLICATIONS</p>
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.6rem)", marginBottom: 8 }}>{product.name}</h1>
      <p style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 720 }}>{product.description}</p>
      <div style={{ padding: 18, margin: "28px 0", border: "1px solid #d9dfeb", borderRadius: 16, background: "#fff" }}>
        <strong>Shared SHIVASHA account</strong>
        {sessionState === "checking" && <p role="status" style={{ lineHeight: 1.6, marginBottom: 0 }}>Checking your secure session…</p>}
        {sessionState === "signed-out" && <p style={{ lineHeight: 1.6, marginBottom: 0 }}>You are not signed in. Sign in through Shivasha Social, then return here in the same browser to use the shared account.</p>}
        {sessionState === "signed-in" && <div>
          <p style={{ lineHeight: 1.6 }}>Signed in as <strong>{session.identity?.name || session.identity?.email}</strong> ({session.identity?.email}).</p>
          <p style={{ lineHeight: 1.6, marginBottom: 12 }}>Your account is recognized by the shared identity service. This application's permissions are still checked separately.</p>
          {logoutError && <p role="alert" style={{ color: "#b91c1c" }}>{logoutError}</p>}
          <button type="button" onClick={logout} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>Sign out of Shivasha</button>
        </div>}
        {sessionState === "signed-out" && <a href="https://social.shivasha.com" style={{ display: "inline-block", marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#172554", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Sign in with Shivasha</a>}
      </div>
      <nav aria-label="Shivasha applications" style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "20px 0" }}>
        {APP_LINKS.map(([label, href]) => <a key={label} href={href} style={{ color: "#1d4ed8", fontWeight: 700 }}>{label}</a>)}
      </nav>
      <h2>Planned modules</h2>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, padding: 0, listStyle: "none" }}>
        {product.features.map(feature => <li key={feature} style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #e0e5ef" }}>{featureLabels[feature] || feature.replaceAll("-", " ")}</li>)}
      </ul>
      <a href="./index.html" style={{ display: "inline-block", marginTop: 24, padding: "13px 18px", borderRadius: 10, background: "#172554", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Open existing Shivasha application</a>
    </section>
  </main>;
}
