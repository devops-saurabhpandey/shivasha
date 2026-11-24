import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "https://shivasha.onrender.com").replace(/\/$/, "");
const input = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #dbe2ea", borderRadius: 10, background: "#fff", color: "#172033", font: "inherit" };
const primary = { border: 0, borderRadius: 10, padding: "11px 15px", background: "#4f46e5", color: "#fff", fontWeight: 800, cursor: "pointer" };
const card = { background: "#fff", border: "1px solid #e5eaf1", borderRadius: 16, padding: 18 };
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function SalesAgent({ auth }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("sell");
  const [productForm, setProductForm] = useState({ name: "", price: "", category: "General", description: "" });
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customer, setCustomer] = useState({ name: "", contact: "", need: "" });
  const [language, setLanguage] = useState("Hinglish");
  const [channel, setChannel] = useState("WhatsApp");
  const [pitch, setPitch] = useState(null);
  const [pitchMode, setPitchMode] = useState("");

  const headers = () => ({ "Content-Type": "application/json", ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}) });
  const request = async (path, options = {}) => {
    const response = await fetch(API_BASE + path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed. Please try again.");
    return body;
  };
  const load = async () => {
    setLoadingData(true);
    try {
      const [p, o] = await Promise.all([request("/api/business/products"), request("/api/business/orders")]);
      setProducts(p.products || []);
      setOrders(o.orders || []);
      setSelectedProduct(current => current || p.products?.[0]?._id || "");
      setNotice("");
    } catch (error) { setNotice(error.message || "Shop data load nahi ho paya."); }
    finally { setLoadingData(false); }
  };
  useEffect(() => { if (auth?.token) load(); else { setLoadingData(false); setNotice("Please sign in to use your private shop workspace."); } }, [auth?.token]);

  const activeProduct = useMemo(() => products.find(p => p._id === selectedProduct) || null, [products, selectedProduct]);
  const confirmedOrders = orders.filter(o => ["Confirmed", "Completed"].includes(o.status)).length;
  const orderValue = orders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  const addProduct = async e => {
    e.preventDefault();
    if (!productForm.name.trim() || productForm.price === "" || Number(productForm.price) < 0) return;
    setBusy("product"); setNotice("");
    try {
      const result = await request("/api/business/products", { method: "POST", body: JSON.stringify({ ...productForm, price: Number(productForm.price) }) });
      setProducts(prev => [result.product, ...prev]);
      setSelectedProduct(result.product._id);
      setProductForm({ name: "", price: "", category: "General", description: "" });
      setNotice("Product catalogue mein save ho gaya.");
      setTab("sell");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const generatePitch = async e => {
    e.preventDefault();
    if (!activeProduct) { setNotice("Pehle product add karein ya select karein."); return; }
    if (!customer.need.trim()) { setNotice("Customer ki zarurat ya problem likhein."); return; }
    setBusy("pitch"); setNotice(""); setPitch(null);
    try {
      const result = await request("/api/sales-agent/generate", { method: "POST", body: JSON.stringify({
        product: activeProduct.name, customerType: "Small business customer",
        customerNeed: customer.need, price: money(activeProduct.price), language, channel
      }) });
      setPitch(result.result);
      setPitchMode(result.mode || "basic_template");
      setNotice(result.disclaimer || "Message bhejne se pehle details check karein.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const saveCustomer = async () => {
    if (!customer.name.trim()) { setNotice("Customer ka naam likhein."); return; }
    setBusy("lead"); setNotice("");
    try {
      await request("/api/business/leads", { method: "POST", body: JSON.stringify({
        name: customer.name.trim(), contact: customer.contact.trim(),
        business: activeProduct?.name || "Shop enquiry", stage: "New",
        notes: ["Need: " + customer.need, "Product: " + (activeProduct?.name || "Not selected")].join("\n")
      }) });
      setNotice("Customer enquiry aapke private CRM mein save ho gayi.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const createOrder = async () => {
    if (!activeProduct) { setNotice("Order banane ke liye product select karein."); return; }
    setBusy("order"); setNotice("");
    try {
      const result = await request("/api/business/orders", { method: "POST", body: JSON.stringify({ productId: activeProduct._id }) });
      setOrders(prev => [result.order, ...prev]);
      setNotice("Order enquiry create ho gayi. Orders tab mein status update kar sakte hain.");
      setTab("orders");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const updateOrder = async (id, status) => {
    setBusy("order-" + id);
    try {
      const result = await request("/api/business/orders/" + id, { method: "PATCH", body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o._id === id ? result.order : o));
      setNotice("Order status update ho gaya.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const shareWhatsApp = () => {
    if (!pitch?.message) return;
    const digits = String(customer.contact || "").replace(/\D/g, "");
    const base = digits.length >= 10 && digits.length <= 15 ? "https://wa.me/" + digits : "https://wa.me/";
    window.open(base + "?text=" + encodeURIComponent(pitch.message), "_blank", "noopener,noreferrer");
  };
  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); setNotice("Message copy ho gaya. Ab aap share kar sakte hain."); }
    catch { setNotice("Copy unavailable. Message ko select karke copy karein."); }
  };
  const removeProduct = async id => {
    if (!window.confirm("Is product ko catalogue se remove karein?")) return;
    try {
      await request("/api/business/products/" + id, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p._id !== id));
      if (selectedProduct === id) setSelectedProduct("");
      setNotice("Product catalogue se remove ho gaya.");
    } catch (error) { setNotice(error.message); }
  };

  const field = (label, value, onChange, placeholder = "", type = "text") => <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>{label}<input style={input} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>;
  const tabs = [["sell", "🛍️ Sell"], ["products", "📦 Products"], ["orders", "🧾 Orders"]];
  return <section className="content" style={{ maxWidth: 1120, margin: "0 auto" }}>
    <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ background: "linear-gradient(120deg,#171044,#4338ca 60%,#0f766e)", color: "#fff", padding: "24px clamp(18px,3vw,30px)" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, opacity: .85 }}>SHIVASHA • SMALL BUSINESS SALES</div>
        <h2 style={{ margin: "8px 0", fontSize: "clamp(24px,4vw,34px)" }}>Dukaan ki Sales, AI ke Saath</h2>
        <p style={{ margin: 0, lineHeight: 1.65, maxWidth: 760 }}>Product list banayein, customer ki need samjhein, AI se sales message taiyar karein aur enquiry/order ek jagah manage karein. Badi sales team ki zarurat nahi.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 1, background: "#e5eaf1" }}>
        {[["Products", products.length], ["Orders", orders.length], ["Confirmed", confirmedOrders], ["Order value", money(orderValue)]].map(([label, value]) => <div key={label} style={{ background: "#fff", padding: 14 }}><small style={{ color: "#64748b" }}>{label}</small><div style={{ fontSize: 20, fontWeight: 850, marginTop: 4 }}>{value}</div></div>)}
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} style={{ ...primary, background: tab === key ? "#4338ca" : "#eef2ff", color: tab === key ? "#fff" : "#3730a3" }}>{label}</button>)}
      <button type="button" onClick={load} disabled={loadingData} style={{ ...primary, background: "#f1f5f9", color: "#334155" }}>↻ Refresh</button>
    </div>
    {notice && <div role="status" style={{ ...card, marginBottom: 14, background: "#f8fafc", color: "#334155" }}>{notice}</div>}
    {loadingData ? <div style={card}>Shop data load ho raha hai…</div> : <>
      {tab === "sell" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <form onSubmit={generatePitch} style={{ ...card, display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>1. Product aur customer select karein</h3>
          <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>Aap kya bech rahe hain?
            <select required value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setPitch(null); }} style={input}><option value="">Select product</option>{products.map(p => <option key={p._id} value={p._id}>{p.name} — {money(p.price)}</option>)}</select>
          </label>
          {!products.length && <p style={{ color: "#64748b", margin: 0 }}>Abhi product nahi hai. Products tab mein pehla product add karein.</p>}
          {field("Customer name (optional)", customer.name, v => setCustomer({ ...customer, name: v }), "Customer ka naam")}
          {field("WhatsApp / phone (optional)", customer.contact, v => setCustomer({ ...customer, contact: v }), "Mobile number", "tel")}
          <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>Customer ko kya chahiye?
            <textarea required maxLength={1500} value={customer.need} onChange={e => setCustomer({ ...customer, need: e.target.value })} placeholder="Jaise: ghar ke liye budget-friendly mixer chahiye…" style={{ ...input, minHeight: 92, resize: "vertical" }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>Language<select value={language} onChange={e => setLanguage(e.target.value)} style={input}><option>Hinglish</option><option>Hindi</option><option>English</option></select></label>
            <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>Channel<select value={channel} onChange={e => setChannel(e.target.value)} style={input}><option>WhatsApp</option><option>Phone call</option><option>Email</option><option>In-person</option></select></label>
          </div>
          {activeProduct && <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}><b>{activeProduct.name}</b><div style={{ fontSize: 20, fontWeight: 850, color: "#4338ca" }}>{money(activeProduct.price)}</div><small style={{ color: "#64748b" }}>{activeProduct.description || activeProduct.category}</small></div>}
          <button type="submit" disabled={busy === "pitch" || !activeProduct} style={{ ...primary, opacity: busy === "pitch" || !activeProduct ? .6 : 1 }}>{busy === "pitch" ? "AI message bana raha hai…" : "✨ AI Sales Message Banayein"}</button>
          <button type="button" disabled={!customer.name.trim() || busy === "lead"} onClick={saveCustomer} style={{ ...primary, background: "#0f766e" }}>{busy === "lead" ? "Saving…" : "Customer enquiry CRM mein save karein"}</button>
          <button type="button" disabled={!activeProduct || busy === "order"} onClick={createOrder} style={{ ...primary, background: "#334155" }}>{busy === "order" ? "Creating…" : "Order enquiry create karein"}</button>
        </form>
        <div style={{ ...card, minHeight: 280 }}>
          <h3 style={{ marginTop: 0 }}>2. AI Sales Assistant</h3>
          {!pitch ? <div style={{ color: "#64748b", lineHeight: 1.7 }}><p>AI customer ki zarurat ke hisaab se:</p><ul><li>Simple product pitch</li><li>Customer se poochhne ke sawal</li><li>Price objection ka jawab</li><li>Follow-up message aur next step</li></ul><p>Generated message ko check karke hi customer ko bhejein.</p></div> : <div>
            <div style={{ padding: 10, borderRadius: 9, background: pitchMode === "ai" ? "#ecfdf5" : "#fff7ed", color: pitchMode === "ai" ? "#166534" : "#9a3412", fontSize: 12, fontWeight: 800 }}>{pitchMode === "ai" ? "AI-generated suggestion" : "Basic template mode — no external AI API used"}</div>
            <h4>Sales approach</h4><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{pitch.approach}</p>
            <h4>Customer se poochhein</h4><ul>{(pitch.questions || []).map((q, i) => <li key={i}>{q}</li>)}</ul>
            <h4>Customer ko bhejne ka message</h4><div style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 13, borderRadius: 10, lineHeight: 1.65 }}>{pitch.message}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><button type="button" onClick={() => copyText(pitch.message)} style={primary}>Copy message</button><button type="button" onClick={shareWhatsApp} style={{ ...primary, background: "#15803d" }}>WhatsApp draft kholein</button></div>
            <h4>Customer objections</h4>{(pitch.objections || []).map((o, i) => <p key={i} style={{ borderBottom: "1px solid #e5eaf1", paddingBottom: 8 }}><b>{o.objection}</b><br/>{o.response}</p>)}
            <h4>Next step</h4><p>{pitch.nextStep}</p>
          </div>}
        </div>
      </div>}
      {tab === "products" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14 }}>
        <form onSubmit={addProduct} style={{ ...card, display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Naya product / service add karein</h3>
          {field("Product name *", productForm.name, v => setProductForm({ ...productForm, name: v }), "e.g. Grocery home delivery")}
          {field("Price (₹) *", productForm.price, v => setProductForm({ ...productForm, price: v }), "499", "number")}
          {field("Category", productForm.category, v => setProductForm({ ...productForm, category: v }), "Grocery / Fashion / Repair")}
          <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 750 }}>Description<textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} maxLength={2000} style={{ ...input, minHeight: 80 }} placeholder="Product ki asli details, size, features…"/></label>
          <button disabled={busy === "product"} style={primary}>{busy === "product" ? "Saving…" : "+ Save product"}</button>
        </form>
        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Aapke products ({products.length})</h3>
          {!products.length ? <p style={{ color: "#64748b" }}>Pehla product add karein. Product aapke account ke private catalogue mein save hoga.</p> : products.map(p => <div key={p._id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderBottom: "1px solid #eef2f7", padding: "9px 0" }}><div><b>{p.name}</b><div style={{ color: "#4338ca", fontWeight: 800 }}>{money(p.price)}</div><small style={{ color: "#64748b" }}>{p.category}</small></div><button type="button" onClick={() => removeProduct(p._id)} style={{ ...primary, background: "#fee2e2", color: "#991b1b" }}>Remove</button></div>)}
        </div>
      </div>}
      {tab === "orders" && <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><h3 style={{ margin: 0 }}>Orders & enquiries</h3><b>{orders.length} records</b></div>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>Order enquiry create karne ke baad status ko Confirmed, Completed ya Cancelled karein. Yeh order record hai; payment gateway abhi is flow mein connect nahi hai.</p>
        {!orders.length ? <p style={{ color: "#64748b" }}>Abhi koi order nahi. Sell tab se pehla order banayein.</p> : orders.map(o => <div key={o._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid #eef2f7", padding: "13px 0" }}><div><b>{o.productName}</b><div style={{ fontWeight: 800, color: "#4338ca" }}>{money(o.price)}</div><small style={{ color: "#64748b" }}>{new Date(o.createdAt).toLocaleString("en-IN")}</small></div><select aria-label={"Order status for " + o.productName} value={o.status} disabled={busy === "order-" + o._id} onChange={e => updateOrder(o._id, e.target.value)} style={{ ...input, width: "auto", minWidth: 140 }}><option>Enquiry</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></div>)}
      </div>}
    </>}
    <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>Privacy & safety: customer details sirf zarurat aur permission ke saath save karein. WhatsApp button sirf aapke liye message draft kholta hai; message automatically send nahi hota. Orders yahan record hote hain, payment collect nahi hota. AI ke banaye claims, price aur product details bhejne se pehle verify karein.</p>
  </section>;
}
