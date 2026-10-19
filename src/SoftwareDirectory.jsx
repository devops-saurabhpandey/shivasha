import React, { useMemo, useState } from "react";
import "./SoftwareDirectory.css";

const SHIVASHA_PRODUCTS = [
  { id: "social", icon: "🌐", name: "SHIVASHA Social", description: "Community feed, posts and social features.", status: "App module — check current availability" },
  { id: "crm", icon: "🤝", name: "SHIVASHA CRM", description: "Customer and relationship management module.", status: "App module — check current availability" },
  { id: "mis", icon: "📊", name: "SHIVASHA MIS Reports", description: "Business reporting and management information module.", status: "App module — check current availability" },
  { id: "ecommerce", icon: "🛒", name: "SHIVASHA E-Commerce", description: "E-commerce module for product and store workflows.", status: "App module — check current availability" },
  { id: "creator", icon: "🎬", name: "SHIVASHA Creator Studio", description: "Content tools and creator-related features.", status: "App module — check current availability" },
  { id: "suite", icon: "🏢", name: "SHIVASHA Business Suite", description: "A planned combined package for eligible business modules.", status: "Coming Soon" },
  { id: "accounting", icon: "🧾", name: "SHIVASHA Accounting", description: "Accounting, billing and GST workflows.", status: "Planned — under development" },
  { id: "hr", icon: "👥", name: "SHIVASHA HR & Payroll", description: "Employee, attendance and payroll workflows.", status: "Planned — under development" },
  { id: "ai", icon: "✨", name: "SHIVASHA AI Assistant", description: "A proposed AI helper for work and business tasks.", status: "Planned — under development" }
];

const PARTNER_SOFTWARE = [
  { id:"office", name:"Office & Productivity", icon:"📝", category:"Office & Productivity", purpose:"Documents, spreadsheets, presentations, email and teamwork.", products:[{name:"Microsoft 365",url:"https://www.microsoft.com/en-in/microsoft-365/buy/compare-all-microsoft-365-products",label:"Plans & Buy",type:"Paid"},{name:"Google Workspace",url:"https://workspace.google.com/intl/en_in/pricing.html",label:"Plans & Buy",type:"Paid"}] },
  { id:"design", name:"Graphic Design & Creative", icon:"🎨", category:"Design & Media", purpose:"Posters, logos, social media creatives and photo editing.", products:[{name:"Canva",url:"https://www.canva.com/en_in/pricing/",label:"Free / Pro plans",type:"Free + Paid"},{name:"Adobe Creative Cloud",url:"https://www.adobe.com/in/creativecloud/plans.html",label:"Plans & Buy",type:"Paid"}] },
  { id:"video", name:"Video & Audio Editing", icon:"🎬", category:"Design & Media", purpose:"Edit videos, reels, podcasts and audio.", products:[{name:"Adobe Premiere",url:"https://www.adobe.com/in/creativecloud/plans.html",label:"Plans & Buy",type:"Paid"},{name:"DaVinci Resolve",url:"https://www.blackmagicdesign.com/products/davinciresolve",label:"Official product",type:"Free + Paid"}] },
  { id:"accounting", name:"Accounting, Billing & GST", icon:"🧾", category:"Business & Finance", purpose:"Invoices, bookkeeping, inventory and business accounts.", products:[{name:"Zoho Books",url:"https://www.zoho.com/in/books/pricing/",label:"Plans & Buy",type:"Free + Paid"},{name:"TallyPrime",url:"https://tallysolutions.com/",label:"Official website",type:"Paid"}] },
  { id:"crm", name:"CRM & Sales Management", icon:"🤝", category:"Business & Finance", purpose:"Manage leads, customers, sales pipelines and follow-ups.", products:[{name:"Zoho CRM",url:"https://www.zoho.com/crm/zohocrm-pricing.html",label:"Plans & Buy",type:"Free + Paid"},{name:"HubSpot CRM",url:"https://www.hubspot.com/products/crm",label:"Free CRM & plans",type:"Free + Paid"}] },
  { id:"ecommerce", name:"E-commerce & Online Store", icon:"🛍️", category:"Business & Finance", purpose:"Build an online shop, manage products and orders.", products:[{name:"Shopify",url:"https://www.shopify.com/in/pricing",label:"Plans & Buy",type:"Paid"},{name:"WooCommerce",url:"https://woocommerce.com/",label:"Official website",type:"Free + Paid"}] },
  { id:"website", name:"Website & App Development", icon:"💻", category:"Development & Cloud", purpose:"Build websites, mobile apps and developer workflows.", products:[{name:"GitHub",url:"https://github.com/pricing",label:"Plans",type:"Free + Paid"},{name:"JetBrains",url:"https://www.jetbrains.com/store/",label:"Software store",type:"Free + Paid"}] },
  { id:"cloud", name:"Cloud Hosting & Servers", icon:"☁️", category:"Development & Cloud", purpose:"Host websites, databases, APIs and business apps.", products:[{name:"Google Cloud",url:"https://cloud.google.com/pricing",label:"Pricing",type:"Free tier + Paid"},{name:"Render",url:"https://render.com/pricing",label:"Plans & pricing",type:"Free + Paid"}] },
  { id:"project", name:"Project & Team Management", icon:"📋", category:"Team & Productivity", purpose:"Plan tasks, projects and team collaboration.", products:[{name:"Notion",url:"https://www.notion.com/pricing",label:"Plans",type:"Free + Paid"},{name:"Trello",url:"https://trello.com/pricing",label:"Plans",type:"Free + Paid"}] },
  { id:"meetings", name:"Meetings & Communication", icon:"🎧", category:"Team & Productivity", purpose:"Online meetings and team communication.", products:[{name:"Zoom",url:"https://zoom.us/pricing",label:"Plans",type:"Free + Paid"},{name:"Google Meet",url:"https://workspace.google.com/products/meet/",label:"Product details",type:"Free + Paid"}] },
  { id:"security", name:"Security & Passwords", icon:"🔐", category:"Security & Utilities", purpose:"Protect devices and accounts.", products:[{name:"Bitdefender",url:"https://www.bitdefender.com/solutions/",label:"Official plans",type:"Free + Paid"},{name:"1Password",url:"https://1password.com/pricing/",label:"Plans",type:"Paid"}] },
  { id:"pdf", name:"PDF & Document Tools", icon:"📄", category:"Office & Productivity", purpose:"Read, edit, convert and organise PDF files.", products:[{name:"Adobe Acrobat",url:"https://www.adobe.com/in/acrobat/pricing.html",label:"Plans",type:"Free + Paid"},{name:"LibreOffice",url:"https://www.libreoffice.org/download/download-libreoffice/",label:"Download",type:"Free"}] },
  { id:"hr", name:"HR, Payroll & Attendance", icon:"👥", category:"Business & Finance", purpose:"Employee records, leave and payroll workflows.", products:[{name:"Zoho People",url:"https://www.zoho.com/people/pricing.html",label:"Plans",type:"Free + Paid"},{name:"Keka",url:"https://www.keka.com/",label:"Official website",type:"Paid"}] },
  { id:"learning", name:"Education & Learning", icon:"📚", category:"Education & Research", purpose:"Learning management and educational content.", products:[{name:"Moodle",url:"https://moodle.com/solutions/",label:"Solutions",type:"Free + Paid"},{name:"Coursera for Business",url:"https://www.coursera.org/business",label:"Plans & enquiry",type:"Paid"}] },
  { id:"ai", name:"AI & Automation", icon:"✨", category:"AI & Automation", purpose:"Writing support, research and workflow automation.", products:[{name:"ChatGPT plans",url:"https://chatgpt.com/pricing/",label:"Plans",type:"Free + Paid"},{name:"Zapier",url:"https://zapier.com/pricing",label:"Plans",type:"Free + Paid"}] }
];

const CATEGORIES = ["All categories", ...new Set(PARTNER_SOFTWARE.map(x => x.category))];
const APP_URL = "https://devops-saurabhpandey.github.io/shivasha/";
const MODULE_TARGETS = { social: "home", crm: "crm", mis: "mis", ecommerce: "ecommerce", creator: "content-studio" };

export default function SoftwareDirectory({ onOpenModule = () => {} }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const visible = useMemo(() => PARTNER_SOFTWARE.filter(item => {
    const searchable = (item.name + " " + item.purpose + " " + item.category + " " + item.products.map(p => p.name).join(" ")).toLowerCase();
    return (category === "All categories" || item.category === category) &&
      (!freeOnly || item.products.some(p => p.type.toLowerCase().includes("free"))) &&
      searchable.includes(query.trim().toLowerCase());
  }), [query, category, freeOnly]);

  return <section className="software-directory content">
    <div className="software-hero"><div><span className="software-eyebrow">SHIVASHA SOFTWARE HUB</span><h2>Software की दुनिया, एक जगह</h2><p>SHIVASHA के अपने modules और दूसरे providers के software — दोनों विकल्प एक जगह खोजें।</p></div><div className="software-hero-icon" aria-hidden="true">🧩</div></div>

    <section className="shivasha-products">
      <div className="software-section-heading"><div><span className="software-eyebrow">OUR PRODUCTS</span><h3>SHIVASHA के अपने सॉफ्टवेयर</h3><p>अलग-अलग मॉड्यूल चुनें; संयुक्त Business Suite की सुविधा अभी तैयार की जा रही है।</p></div><a className="software-open-app" href={APP_URL} target="_blank" rel="noopener noreferrer">SHIVASHA खोलें ↗</a></div>
      <div className="shivasha-product-grid">{SHIVASHA_PRODUCTS.map(product => <article className="shivasha-product-card" key={product.id}><span className="shivasha-product-icon" aria-hidden="true">{product.icon}</span><h4>{product.name}</h4><p>{product.description}</p><span className={product.status.startsWith("Planned") || product.status === "Coming Soon" ? "shivasha-status planned" : "shivasha-status"}>{product.status}</span>{!product.status.startsWith("Planned") && product.status !== "Coming Soon" && (MODULE_TARGETS[product.id] ? <button type="button" className="software-module-open" onClick={() => onOpenModule(MODULE_TARGETS[product.id])}>मॉड्यूल खोलें ↗</button> : <a href={APP_URL} target="_blank" rel="noopener noreferrer">App देखें ↗</a>)}</article>)}</div>
      <div className="software-plan-note"><b>दोनों खरीद मॉडल का लक्ष्य:</b> अलग-अलग module plans और एक combined Business Suite. अभी कोई SHIVASHA price, checkout या paid subscription सक्रिय होने का दावा नहीं है। खरीद शुरू करने से पहले feature availability और pricing प्रकाशित की जाएगी।</div>
    </section>

    <section className="software-plan-builder" aria-labelledby="software-plan-title">
      <div className="software-section-heading"><div><span className="software-eyebrow">PLAN SELECTOR PREVIEW</span><h3 id="software-plan-title">अपना SHIVASHA प्लान चुनें</h3><p>दोनों मॉडल की रूपरेखा तैयार है। कीमत और checkout सक्रिय होने तक यह केवल चयन का preview है।</p></div></div>
      <div className="software-plan-options">
        <article className="software-plan-option">
          <span className="software-plan-badge">FLEXIBLE</span><h4>अलग-अलग मॉड्यूल</h4><p>केवल वही SHIVASHA मॉड्यूल चुनें जिसकी आपके काम में जरूरत है।</p>
          <ul><li>Social</li><li>CRM</li><li>MIS Reports</li><li>E-Commerce</li><li>Creator Studio</li></ul>
          <button type="button" onClick={() => setSelectedPlan("individual")} className={selectedPlan === "individual" ? "software-plan-select selected" : "software-plan-select"}>{selectedPlan === "individual" ? "चुना गया ✓" : "यह मॉडल चुनें"}</button>
        </article>
        <article className="software-plan-option featured">
          <span className="software-plan-badge">ALL-IN-ONE</span><h4>SHIVASHA Business Suite</h4><p>योग्य बिज़नेस मॉड्यूल को एक संयुक्त पैकेज में लेने का प्रस्ताव।</p>
          <ul><li>एक संयुक्त प्लान</li><li>मॉड्यूल के अनुसार access</li><li>Business workflow का एक स्थान</li><li>वास्तविक उपलब्धता की पुष्टि आवश्यक</li></ul>
          <button type="button" onClick={() => setSelectedPlan("suite")} className={selectedPlan === "suite" ? "software-plan-select selected" : "software-plan-select"}>{selectedPlan === "suite" ? "चुना गया ✓" : "यह मॉडल चुनें"}</button>
        </article>
      </div>
      <div className="software-plan-status" role="status"><b>{selectedPlan === "suite" ? "Business Suite मॉडल चुना गया" : selectedPlan === "individual" ? "अलग-अलग मॉड्यूल वाला मॉडल चुना गया" : "अपना पसंदीदा मॉडल चुनें"}</b><span>अभी कोई ऑर्डर, भुगतान या subscription नहीं बनाया जाता। कीमत, प्लान की शर्तें और सुरक्षित checkout बाद में जोड़े जाएँगे।</span></div>
      <div className="software-plan-comparison">
        <h4>दोनों मॉडल में क्या अंतर है?</h4>
        <div className="software-comparison-scroll">
          <table>
            <thead><tr><th>सुविधा</th><th>अलग-अलग मॉड्यूल</th><th>Business Suite</th></tr></thead>
            <tbody>
              <tr><td>खरीद का तरीका</td><td>जरूरत के अनुसार module</td><td>एक संयुक्त पैकेज (प्रस्तावित)</td></tr>
              <tr><td>Social, CRM, MIS, E-Commerce</td><td>अलग चयन</td><td>अंतिम शामिल modules की पुष्टि बाकी</td></tr>
              <tr><td>Creator Studio</td><td>अलग चयन</td><td>शामिल होना अभी तय नहीं</td></tr>
              <tr><td>मासिक / वार्षिक कीमत</td><td>अभी तय नहीं</td><td>अभी तय नहीं</td></tr>
              <tr><td>ऑनलाइन भुगतान</td><td>अभी सक्रिय नहीं</td><td>अभी सक्रिय नहीं</td></tr>
            </tbody>
          </table>
        </div>
        <p>यह तुलना planning preview है, बिक्री का प्रस्ताव या उपलब्ध सुविधाओं की गारंटी नहीं। कीमत, modules, renewal/cancellation नियम और भुगतान चालू करने से पहले इन्हें अंतिम रूप दिया जाएगा।</p>
      </div>
    </section>

    <section className="partner-software">
      <div className="software-section-heading"><div><span className="software-eyebrow">PARTNER / EXTERNAL PRODUCTS</span><h3>दूसरे सॉफ्टवेयर और आधिकारिक खरीद लिंक</h3><p>ये बाहरी providers के उत्पाद हैं; उनकी कीमतें और शर्तें उन्हीं की वेबसाइट पर तय होती हैं।</p></div></div>
      <div className="software-controls"><label className="software-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Software या काम खोजें…"/></label><select aria-label="Filter software category" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><label className="software-free-filter"><input type="checkbox" checked={freeOnly} onChange={e=>setFreeOnly(e.target.checked)}/> Free option वाले</label></div>
      <div className="software-results-heading"><h3>Software categories</h3><span>{visible.length} categories</span></div>
      {visible.length ? <div className="software-grid">{visible.map(item=><article className="software-card" key={item.id}><div className="software-card-top"><span className="software-icon" aria-hidden="true">{item.icon}</span><span className="software-category">{item.category}</span></div><h4>{item.name}</h4><p>{item.purpose}</p><div className="software-product-list">{item.products.map(product=><div className="software-product" key={product.name}><div><b>{product.name}</b><small>{product.type}</small></div><a href={product.url} target="_blank" rel="noopener noreferrer">{product.label} ↗</a></div>)}</div></article>)}</div> : <div className="software-empty">कोई matching software नहीं मिला। दूसरा शब्द या category चुनें।</div>}
      <aside className="software-notice"><b>खरीदने से पहले:</b> कीमत, GST, renewal, trial और cancellation policy आधिकारिक वेबसाइट पर जाँचें। SHIVASHA इन बाहरी उत्पादों का विक्रेता नहीं है; खरीद और भुगतान संबंधित provider की वेबसाइट पर होंगे। Free trial अपने-आप paid subscription में बदल सकता है—शर्तें पढ़ें।</aside>
    </section>
  </section>;
}
