import React, { useEffect, useMemo, useState } from "react";
import "./money-management.css";

const STORAGE_PREFIX = "shivasha_money_management_v2";
const SETTINGS_PREFIX = "shivasha_money_balance_settings_v1";
const BUCKETS = [
  { id: "survival", title: "Survival Money", hindi: "जरूरी खर्च", description: "घर, भोजन, बिजली, यात्रा और रोजमर्रा की जरूरतें", color: "#2563eb" },
  { id: "security", title: "Security Money", hindi: "बचत व सुरक्षा", description: "आपातकालीन फंड, बचत और भविष्य की सुरक्षा", color: "#0f9f6e" },
  { id: "freedom", title: "Freedom Money", hindi: "पसंद व स्वतंत्रता", description: "सीखना, घूमना, शौक और अपना व्यवसाय", color: "#8b5cf6" }
];
const DEFAULT_SPLIT = { survival: 50, security: 30, freedom: 20 };
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = date => String(date || "").slice(0, 7);
const safeRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; } catch { return fallback; } };

export default function MoneyManagement({ auth }) {
  const userKey = auth?.user?._id || auth?.user?.id || auth?.user?.email || "local-user";
  const storageKey = STORAGE_PREFIX + ":" + userKey;
  const settingsKey = SETTINGS_PREFIX + ":" + userKey;
  const [entries, setEntries] = useState(() => safeRead(storageKey, []));
  const [settings, setSettings] = useState(() => ({ split: DEFAULT_SPLIT, emergencyTarget: 0, ...safeRead(settingsKey, {}) }));
  const [loadedKey, setLoadedKey] = useState(storageKey);
  const [month, setMonth] = useState(monthKey(today()));
  const [form, setForm] = useState({ type: "income", amount: "", bucket: "survival", category: "Salary", note: "", date: today() });
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { setEntries(safeRead(storageKey, [])); setSettings({ split: DEFAULT_SPLIT, emergencyTarget: 0, ...safeRead(settingsKey, {}) }); setLoadedKey(storageKey); }, [storageKey, settingsKey]);
  useEffect(() => { if (loadedKey !== storageKey) return; try { localStorage.setItem(storageKey, JSON.stringify(entries)); } catch { setNotice("इस डिवाइस में डेटा सेव नहीं हो पाया। CSV बैकअप डाउनलोड करें।"); } }, [entries, storageKey, loadedKey]);
  useEffect(() => { if (loadedKey !== storageKey) return; try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { setNotice("आपकी सेटिंग सेव नहीं हो पाई।"); } }, [settings, settingsKey, loadedKey]);

  const visible = useMemo(() => entries.filter(item => monthKey(item.date) === month), [entries, month]);
  const income = visible.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = visible.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const expenseByBucket = useMemo(() => Object.fromEntries(BUCKETS.map(bucket => [bucket.id, visible.filter(item => item.type === "expense" && (item.bucket || "survival") === bucket.id).reduce((sum, item) => sum + item.amount, 0)])), [visible]);
  const planned = Object.fromEntries(BUCKETS.map(bucket => [bucket.id, income * (Number(settings.split?.[bucket.id]) || 0) / 100]));
  const splitTotal = BUCKETS.reduce((sum, bucket) => sum + (Number(settings.split?.[bucket.id]) || 0), 0);
  const securitySaved = Math.max(0, planned.security - expenseByBucket.security);
  const progress = Number(settings.emergencyTarget) > 0 ? Math.min(100, securitySaved / Number(settings.emergencyTarget) * 100) : 0;

  const addEntry = event => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !form.date) { setNotice("कृपया सही राशि और तारीख भरें।"); return; }
    setEntries(current => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...form, amount, note: form.note.trim() }, ...current]);
    setMonth(monthKey(form.date));
    setForm(current => ({ ...current, amount: "", note: "", date: today() }));
    setNotice("लेन-देन इस डिवाइस में सेव हो गया।");
  };
  const removeEntry = id => { if (!window.confirm("क्या आप यह रिकॉर्ड हटाना चाहते हैं?")) return; setEntries(current => current.filter(item => item.id !== id)); };
  const exportCsv = () => {
    const rows = [["Date", "Type", "Bucket", "Category", "Amount INR", "Note"], ...visible.map(item => [item.date, item.type, item.bucket || "survival", item.category, item.amount, item.note || ""])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "shivasha-money-balance-" + month + ".csv"; link.click(); URL.revokeObjectURL(url);
  };
  const updateSplit = (id, value) => setSettings(current => ({ ...current, split: { ...current.split, [id]: Math.max(0, Math.min(100, Number(value) || 0)) } }));
  const categories = form.type === "income" ? ["Salary", "Business income", "Interest", "Gift", "Other"] : form.bucket === "survival" ? ["Food", "Housing", "Bills", "Transport", "Health", "Family", "Other"] : form.bucket === "security" ? ["Emergency fund", "Savings", "Insurance", "Debt repayment", "Other"] : ["Learning", "Travel", "Hobbies", "Business", "Shopping", "Other"];

  return <section className="content money-page">
    <div className="feed-head"><div><span className="eyebrow">SHIVASHA FINANCE</span><h2>Money Balance · पैसा संतुलन</h2><p>कमाई को जरूरत, सुरक्षा और पसंद—तीनों के बीच समझदारी से बांटें।</p></div><button type="button" className="secondary" onClick={exportCsv} disabled={!visible.length}>Export CSV</button></div>
    <div className="module-notice">🔒 Privacy: आपके वित्तीय रिकॉर्ड इसी ब्राउज़र/डिवाइस में सेव होते हैं। वे SHIVASHA server या MongoDB पर अपलोड नहीं होते। डिवाइस बदलने या browser data clear करने से पहले CSV बैकअप रखें।</div>
    {notice && <div className="login-message" role="status">{notice}</div>}
    <div className="money-month panel"><label>महीना चुनें<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><span>{visible.length} लेन-देन</span></div>
    <div className="module-stats money-stats">
      <div className="panel"><small>कुल आय · Income</small><strong>{money(income)}</strong></div>
      <div className="panel"><small>कुल खर्च · Expenses</small><strong>{money(expenses)}</strong></div>
      <div className="panel"><small>बाकी · Balance</small><strong className={balance < 0 ? "money-negative" : "money-positive"}>{money(balance)}</strong></div>
      <div className="panel"><small>बचत दर · Savings rate</small><strong>{income > 0 ? ((balance / income) * 100).toFixed(1) : "0.0"}%</strong></div>
    </div>
    <div className="panel money-buckets">
      <div className="panel-head"><div><h3>आपके पैसे के तीन हिस्से</h3><p className="muted">मासिक आय के आधार पर सुझाया गया बंटवारा; अपनी स्थिति के अनुसार बदलें।</p></div><button type="button" className="secondary" onClick={() => setShowSettings(value => !value)}>{showSettings ? "सेटिंग बंद करें" : "बंटवारा सेट करें"}</button></div>
      {showSettings && <div className="money-settings">
        <div className="money-settings-grid">{BUCKETS.map(bucket => <label key={bucket.id}>{bucket.title} (%)<input type="number" min="0" max="100" value={settings.split[bucket.id]} onChange={event => updateSplit(bucket.id, event.target.value)} /></label>)}</div>
        <label>Emergency fund लक्ष्य (₹)<input type="number" min="0" value={settings.emergencyTarget} onChange={event => setSettings(current => ({ ...current, emergencyTarget: Math.max(0, Number(event.target.value) || 0) }))} placeholder="उदाहरण: 60000" /></label>
        <p className={splitTotal === 100 ? "money-positive" : "money-negative"}>कुल बंटवारा: {splitTotal}% {splitTotal === 100 ? "✓" : "— कुल 100% होना चाहिए।"}</p>
      </div>}
      <div className="money-bucket-grid">{BUCKETS.map(bucket => <article className="money-bucket-card" key={bucket.id} style={{ "--bucket-color": bucket.color }}>
        <span className="money-bucket-kicker">{bucket.hindi}</span><h3>{bucket.title}</h3><p>{bucket.description}</p>
        <div className="money-bucket-numbers"><div><small>योजना</small><b>{money(planned[bucket.id])}</b></div><div><small>खर्च</small><b>{money(expenseByBucket[bucket.id])}</b></div><div><small>बाकी</small><b>{money(planned[bucket.id] - expenseByBucket[bucket.id])}</b></div></div>
        <div className="money-category-track"><i style={{ width: Math.min(100, planned[bucket.id] > 0 ? expenseByBucket[bucket.id] / planned[bucket.id] * 100 : 0) + "%", background: bucket.color }} /></div>
        <small>{settings.split[bucket.id]}% आय का लक्ष्य</small>
      </article>)}</div>
      {splitTotal !== 100 && <p className="money-warning">आपका बंटवारा अभी {splitTotal}% है। बेहतर योजना के लिए कुल 100% करें।</p>}
      {Number(settings.emergencyTarget) > 0 && <div className="money-emergency"><div><b>Emergency fund progress</b><strong>{progress.toFixed(1)}%</strong></div><div className="money-category-track"><i style={{ width: progress + "%", background: "#0f9f6e" }} /></div><small>इस महीने Security bucket का अनुमानित शेष {money(securitySaved)} / लक्ष्य {money(settings.emergencyTarget)}। यह केवल इस महीने के दर्ज रिकॉर्ड पर आधारित है।</small></div>}
    </div>
    <div className="module-grid">
      <form className="panel" onSubmit={addEntry}>
        <div className="panel-head"><h3>नया लेन-देन जोड़ें</h3></div>
        <label>प्रकार<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value, category: event.target.value === "income" ? "Salary" : "Food" })}><option value="income">आय (Income)</option><option value="expense">खर्च (Expense)</option></select></label>
        {form.type === "expense" && <label>पैसे का हिस्सा<select value={form.bucket} onChange={event => setForm({ ...form, bucket: event.target.value, category: event.target.value === "survival" ? "Food" : event.target.value === "security" ? "Savings" : "Learning" })}>{BUCKETS.map(bucket => <option key={bucket.id} value={bucket.id}>{bucket.title} — {bucket.hindi}</option>)}</select></label>}
        <label>राशि (₹)<input required type="number" min="1" step="0.01" inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="उदाहरण: 1500" /></label>
        <label>श्रेणी<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>तारीख<input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <label>विवरण (वैकल्पिक)<input maxLength="120" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="जैसे: मासिक वेतन / किराया" /></label>
        <button className="primary" type="submit">+ रिकॉर्ड सेव करें</button>
      </form>
      <div className="panel"><div className="panel-head"><h3>महीने का खर्च विश्लेषण</h3></div>
        {BUCKETS.map(bucket => <div className="money-category" key={bucket.id}><div><span>{bucket.title}</span><b>{money(expenseByBucket[bucket.id])}</b></div><div className="money-category-track"><i style={{ width: (expenses ? expenseByBucket[bucket.id] / expenses * 100 : 0) + "%", background: bucket.color }} /></div></div>)}
        {!expenses && <div className="empty">इस महीने अभी कोई खर्च दर्ज नहीं है।</div>}
      </div>
    </div>
    <div className="panel money-transactions"><div className="panel-head"><h3>लेन-देन का रिकॉर्ड</h3><b>{visible.length} records</b></div>
      {visible.length ? visible.slice().sort((a, b) => b.date.localeCompare(a.date)).map(item => <article className="module-row" key={item.id}><div><b>{item.note || item.category}</b><p>{item.date} · {item.type === "income" ? "आय" : BUCKETS.find(bucket => bucket.id === (item.bucket || "survival"))?.title} · {item.category}</p></div><div className="module-row-actions"><strong className={item.type === "income" ? "money-positive" : "money-negative"}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</strong><button type="button" className="secondary" onClick={() => removeEntry(item.id)} aria-label="Delete transaction">Delete</button></div></article>) : <div className="empty">इस महीने कोई रिकॉर्ड नहीं है। आय और खर्च जोड़कर शुरुआत करें।</div>}
    </div>
    <div className="panel money-guidance"><h3>पैसे को संभालने के 5 नियम</h3><ul><li>पहले जरूरी खर्च और परिवार की जरूरतें सुरक्षित करें।</li><li>धीरे-धीरे 3–6 महीने के जरूरी खर्च के बराबर Emergency Fund बनाएं।</li><li>बचत को महीने के अंत में बची रकम नहीं, बल्कि पहले से तय हिस्सा बनाएं।</li><li>Freedom Money को अपनी पसंद, सीखने और व्यवसाय में सोच-समझकर लगाएं।</li><li>हर सप्ताह खर्च देखें और हर महीने बंटवारा सुधारें।</li></ul><small>यह बजट और रिकॉर्ड रखने का टूल है, निवेश/टैक्स सलाह या बैंक अकाउंट से जुड़ी सेवा नहीं।</small></div>
  </section>;
}
