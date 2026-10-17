import React, { useMemo, useState } from "react";

const WISDOM = [
  { text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥", source: "श्रीमद्भगवद्गीता 2.47", meaning: "तुम्हारा अधिकार कर्म करने में है, उसके फल पर नहीं। फल को ही कर्म का एकमात्र उद्देश्य मत बनाओ और कर्म न करने में भी आसक्त मत हो।", lesson: "पूरी लगन से अपना कर्तव्य करो; परिणाम की चिंता को अपने प्रयास पर हावी न होने दो।", category: "कर्म" },
  { text: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥", source: "श्रीमद्भगवद्गीता 2.48", meaning: "हे धनंजय, आसक्ति छोड़कर और सफलता-असफलता में समान भाव रखकर कर्म करो। यही समत्व योग कहलाता है।", lesson: "सफलता और असफलता—दोनों में संतुलित रहकर प्रयास जारी रखें।", category: "समत्व" },
  { text: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥", source: "श्रीमद्भगवद्गीता 6.5", meaning: "मनुष्य को अपने द्वारा अपना उत्थान करना चाहिए, स्वयं को नीचे नहीं गिराना चाहिए; मन ही अपना मित्र और मन ही अपना शत्रु बन सकता है।", lesson: "अपने विचारों और आदतों को ऐसा बनाएं जो आपको बेहतर बनने में मदद करें।", category: "आत्म-विकास" },
  { text: "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥", source: "श्रीमद्भगवद्गीता 12.13", meaning: "जो किसी से द्वेष नहीं करता, सबके प्रति मित्रता और करुणा रखता है, अहंकार से दूर रहता है और सुख-दुःख में संतुलित रहता है, वह प्रिय भक्त है।", lesson: "दूसरों के प्रति दया, मित्रता और क्षमा का भाव रखें।", category: "करुणा" },
  { text: "अनुद्वेगकरं वाक्यं सत्यं प्रियहितं च यत्।\nस्वाध्यायाभ्यसनं चैव वाङ्मयं तप उच्यते॥", source: "श्रीमद्भगवद्गीता 17.15", meaning: "ऐसी वाणी जो दूसरों को व्यर्थ उद्विग्न न करे, सत्य हो, प्रिय और हितकारी हो, तथा स्वाध्याय—इसे वाणी का तप कहा गया है।", lesson: "बोलने से पहले सोचें: क्या मेरी बात सत्य, उपयोगी और सम्मानजनक है?", category: "वाणी" },
  { text: "श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः।", source: "श्रीमद्भगवद्गीता 4.39 (अंश)", meaning: "श्रद्धा रखने वाला, ज्ञान के लिए तत्पर और इन्द्रियों को संयमित रखने वाला व्यक्ति ज्ञान प्राप्त करता है।", lesson: "सीखने की लगन, धैर्य और अनुशासन ज्ञान के रास्ते खोलते हैं।", category: "ज्ञान" },
  { text: "न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।", source: "श्रीमद्भगवद्गीता 4.38 (अंश)", meaning: "इस संसार में ज्ञान के समान पवित्र करने वाला कुछ नहीं है।", lesson: "हर दिन कुछ अच्छा सीखने और अपने अनुभवों पर विचार करने का समय निकालें।", category: "ज्ञान" }
];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export default function DailyWisdom() {
  const today = useMemo(() => new Date(), []);
  const quote = WISDOM[(dayOfYear(today) - 1) % WISDOM.length];
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shivasha_wisdom_favorites") || "[]"); } catch { return []; }
  });
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState("");
  const saved = favorites.some(item => item.source === quote.source && item.text === quote.text);
  const toggleFavorite = () => {
    const next = saved ? favorites.filter(item => !(item.source === quote.source && item.text === quote.text)) : [...favorites, quote];
    setFavorites(next);
    localStorage.setItem("shivasha_wisdom_favorites", JSON.stringify(next));
    setNotice(saved ? "पसंदीदा सूची से हटा दिया गया।" : "पसंदीदा सूची में सेव हो गया।");
  };
  const share = async item => {
    const message = `🕉️ Shivasha — आज का ज्ञान\n\n${item.text}\n\n📚 ${item.source}\n\nअर्थ: ${item.meaning}\n\nआज की सीख: ${item.lesson}`;
    try {
      if (navigator.share) await navigator.share({ title: "Shivasha — आज का ज्ञान", text: message });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(message); setNotice("श्लोक कॉपी हो गया; अब शेयर कर सकते हैं।"); }
      else setNotice(message);
    } catch (e) { if (e?.name !== "AbortError") setNotice("शेयर नहीं हो पाया।"); }
  };
  return <section className="content wisdom-page">
    <div className="feed-head"><div><p className="eyebrow">SHIVASHA • DAILY SPIRITUAL WISDOM</p><h2>🕉️ आज का ज्ञान</h2><p>प्राचीन भारतीय ज्ञान से हर दिन एक नई सीख।</p></div></div>
    <article className="wisdom-card">
      <div className="wisdom-date">{today.toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <div className="wisdom-symbol" aria-hidden="true">ॐ</div>
      <h3>आज का श्लोक</h3><blockquote>{quote.text}</blockquote>
      <div className="wisdom-source">📚 स्रोत: {quote.source}</div>
      <div className="wisdom-section"><h4>🇮🇳 सरल हिंदी अर्थ</h4><p>{quote.meaning}</p></div>
      <div className="wisdom-section"><h4>💡 आज की सीख</h4><p>{quote.lesson}</p></div>
      <div className="wisdom-actions"><button className="secondary" onClick={toggleFavorite}>{saved ? "♥ सेव किया गया" : "♡ पसंदीदा में सेव करें"}</button><button className="primary" onClick={() => share(quote)}>↗ शेयर करें</button></div>
      {notice && <p className="wisdom-notice" role="status">{notice}</p>}
    </article>
    <div className="wisdom-history panel"><div className="panel-head"><div><h3>📜 श्लोक संग्रह</h3><p>अभी उपलब्ध प्रमाणित संदर्भों वाले श्लोक</p></div><button className="secondary" onClick={() => setShowAll(v => !v)}>{showAll ? "कम दिखाएँ" : "सभी देखें"}</button></div>
      {showAll && <div className="wisdom-list">{WISDOM.map((item, i) => <article className="wisdom-list-item" key={item.source}><small>दिन {i + 1} • {item.category}</small><blockquote>{item.text}</blockquote><b>{item.source}</b><p>{item.meaning}</p><button className="secondary" onClick={() => share(item)}>↗ शेयर करें</button></article>)}</div>}
    </div>
    <p className="wisdom-disclaimer">ध्यान दें: अभी इस शुरुआती संस्करण में श्रीमद्भगवद्गीता के चुनिंदा श्लोक हैं। अन्य वेद, पुराण, रामायण, उपनिषद और महाभारत के श्लोक स्रोत-सत्यापन के बाद जोड़े जाएंगे।</p>
  </section>;
}
