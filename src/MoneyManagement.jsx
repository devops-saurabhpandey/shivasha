import React, { useEffect, useMemo, useState } from "react";
import "./money-management.css";

const STORAGE_PREFIX = "shivasha_money_management_v1";
const CATEGORIES = ["Food", "Housing", "Travel", "Bills", "Shopping", "Health", "Education", "Family", "Business", "Other"];
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = date => String(date || "").slice(0, 7);

function readEntries(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function MoneyManagement({ auth }) {
  const userKey = auth?.user?._id || auth?.user?.id || auth?.user?.email || "local-user";
  const storageKey = STORAGE_PREFIX + ":" + userKey;
  const [entries, setEntries] = useState(() => readEntries(storageKey));
  const [month, setMonth] = useState(monthKey(today()));
  const [form, setForm] = useState({ type: "expense", amount: "", category: "Food", note: "", date: today() });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setEntries(readEntries(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      setNotice("इस डिवाइस में डेटा सेव नहीं हो पाया। कुछ जगह खाली करके दोबारा कोशिश करें।");
    }
  }, [entries, storageKey]);

  const visible = useMemo(() => entries.filter(item => monthKey(item.date) === month), [entries, month]);
  const income = visible.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = visible.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const expenseByCategory = useMemo(() => CATEGORIES.map(category => ({
    category,
    amount: visible.filter(item => item.type === "expense" && item.category === category).reduce((sum, item) => sum + item.amount, 0)
  })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount), [visible]);

  const addEntry = event => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !form.date) {
      setNotice("कृपया सही राशि और तारीख भरें।");
      return;
    }
    setEntries(current => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...form, amount, note: form.note.trim() }, ...current]);
    setMonth(monthKey(form.date));
    setForm(current => ({ ...current, amount: "", note: "", date: today() }));
    setNotice("लेन-देन इस डिवाइस में सेव हो गया।");
  };

  const removeEntry = id => {
    if (!window.confirm("क्या आप यह रिकॉर्ड हटाना चाहते हैं?")) return;
    setEntries(current => current.filter(item => item.id !== id));
  };

  const exportCsv = () => {
    const rows = [["Date", "Type", "Category", "Amount INR", "Note"], ...visible.map(item => [item.date, item.type, item.category, item.amount, item.note || ""])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "shivasha-money-management-" + month + ".csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const percent = income > 0 ? Math.max(0, Math.min(100, expenses / income * 100)) : 0;

  return <section className="content money-page">
    <div className="feed-head">
      <div><span className="eyebrow">SHIVASHA FINANCE</span><h2>Money Management · धन प्रबंधन</h2><p>अपनी आय, खर्च और बचत को एक जगह समझें और नियंत्रित करें।</p></div>
      <button type="button" className="secondary" onClick={exportCsv} disabled={!visible.length}>Export CSV</button>
    </div>
    <div className="module-notice">🔒 Privacy: आपके रिकॉर्ड अभी इसी ब्राउज़र/डिवाइस में सेव होते हैं। वे SHIVASHA server या MongoDB पर अपलोड नहीं होते। Browser data clear करने या device बदलने पर export backup रखें।</div>
    {notice && <div className="login-message" role="status">{notice}</div>}
    <div className="money-month panel">
      <label>महीना चुनें<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
      <span>{visible.length} लेन-देन</span>
    </div>
    <div className="module-stats money-stats">
      <div className="panel"><small>कुल आय · Income</small><strong>{money(income)}</strong></div>
      <div className="panel"><small>कुल खर्च · Expenses</small><strong>{money(expenses)}</strong></div>
      <div className="panel"><small>शेष राशि · Balance</small><strong className={balance < 0 ? "money-negative" : "money-positive"}>{money(balance)}</strong></div>
      <div className="panel"><small>बचत दर · Savings rate</small><strong>{income > 0 ? ((balance / income) * 100).toFixed(1) : "0.0"}%</strong></div>
    </div>
    <div className="module-grid">
      <form className="panel" onSubmit={addEntry}>
        <div className="panel-head"><h3>नया लेन-देन जोड़ें</h3></div>
        <label>प्रकार<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value, category: event.target.value === "income" ? "Salary" : "Food" })}><option value="income">आय (Income)</option><option value="expense">खर्च (Expense)</option></select></label>
        <label>राशि (₹)<input required type="number" min="1" step="0.01" inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="उदाहरण: 1500" /></label>
        <label>श्रेणी<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{(form.type === "income" ? ["Salary", "Business income", "Interest", "Gift", "Other"] : CATEGORIES).map(category => <option key={category}>{category}</option>)}</select></label>
        <label>तारीख<input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <label>विवरण (वैकल्पिक)<input maxLength="120" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="जैसे: मासिक वेतन / किराया" /></label>
        <button className="primary" type="submit">+ रिकॉर्ड सेव करें</button>
      </form>
      <div className="panel">
        <div className="panel-head"><h3>खर्च का विश्लेषण</h3></div>
        {income > 0 && <div className="money-meter"><div><span>आय में से खर्च</span><b>{percent.toFixed(1)}%</b></div><div className="money-meter-track"><i style={{ width: percent + "%" }} /></div></div>}
        {expenseByCategory.length ? expenseByCategory.map(item => <div className="money-category" key={item.category}><div><span>{item.category}</span><b>{money(item.amount)}</b></div><div className="money-category-track"><i style={{ width: (expenses ? item.amount / expenses * 100 : 0) + "%" }} /></div></div>) : <div className="empty">इस महीने अभी कोई खर्च दर्ज नहीं है।</div>}
      </div>
    </div>
    <div className="panel money-transactions">
      <div className="panel-head"><h3>लेन-देन का रिकॉर्ड</h3><b>{visible.length} records</b></div>
      {visible.length ? visible.slice().sort((a, b) => b.date.localeCompare(a.date)).map(item => <article className="module-row" key={item.id}>
        <div><b>{item.note || item.category}</b><p>{item.date} · {item.category}</p></div>
        <div className="module-row-actions"><strong className={item.type === "income" ? "money-positive" : "money-negative"}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</strong><button type="button" className="secondary" onClick={() => removeEntry(item.id)} aria-label="Delete transaction">Delete</button></div>
      </article>) : <div className="empty">इस महीने कोई रिकॉर्ड नहीं है। आय और खर्च जोड़कर शुरुआत करें।</div>}
    </div>
    <div className="panel money-guidance"><h3>स्मार्ट Money Management के 5 नियम</h3><ul><li>हर महीने पहले जरूरी खर्च और बचत की योजना बनाएं।</li><li>आपातकालीन फंड में धीरे-धीरे 3–6 महीने के जरूरी खर्च जमा करने का लक्ष्य रखें।</li><li>महंगे ब्याज वाले कर्ज को प्राथमिकता से चुकाएं।</li><li>निवेश से पहले जोखिम, समय-सीमा और जरूरत समझें।</li><li>हर सप्ताह अपने खर्च की समीक्षा करें।</li></ul><small>यह बजट और रिकॉर्ड रखने का टूल है, निवेश/टैक्स सलाह या बैंक अकाउंट से जुड़ी सेवा नहीं।</small></div>
  </section>;
}
