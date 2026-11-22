import React from "react";
import { SHIVASHA_APPS } from "./config/productNavigation.js";

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
  if (!product) return <main className="content narrow"><section className="panel"><h1>Unknown Shivasha application</h1><a href="./index.html">Open Shivasha</a></section></main>;

  return <main style={{ minHeight: "100vh", padding: "clamp(20px, 5vw, 64px)", background: "var(--background, #f5f7fb)", color: "var(--text, #172033)" }}>
    <section style={{ maxWidth: 920, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".12em", fontWeight: 800, opacity: .7 }}>SHIVASHA · FOUR APPLICATIONS</p>
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.6rem)", marginBottom: 8 }}>{product.name}</h1>
      <p style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 720 }}>{product.description}</p>
      <div style={{ padding: 18, margin: "28px 0", border: "1px solid #d9dfeb", borderRadius: 16, background: "#fff" }}>
        <strong>Independent application entry point created</strong>
        <p style={{ lineHeight: 1.6, marginBottom: 0 }}>This is the first migration-stage portal, not yet a fully separated product runtime. Existing modules, login and data remain in the current Shivasha application while their secure separation is implemented and tested.</p>
      </div>
      <h2>Planned modules</h2>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, padding: 0, listStyle: "none" }}>
        {product.features.map(feature => <li key={feature} style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #e0e5ef" }}>{featureLabels[feature] || feature.replaceAll("-", " ")}</li>)}
      </ul>
      <a href="./index.html" style={{ display: "inline-block", marginTop: 24, padding: "13px 18px", borderRadius: 10, background: "#172554", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Open existing Shivasha application</a>
    </section>
  </main>;
}
