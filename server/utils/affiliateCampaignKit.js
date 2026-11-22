const clean = (value, max) => String(value || "")
  .replace(/[\r\n\t]+/g, " ")
  .replace(/\s{2,}/g, " ")
  .replace(/guaranteed\s+(?:income|earnings?|jobs?|leads?)/gi, "learning")
  .replace(/assured\s+(?:income|earnings?|jobs?|leads?)/gi, "learning")
  .replace(/get\s+rich\s+quick/gi, "learn new skills")
  .trim()
  .slice(0, max);

export function buildAffiliateCampaignKit({ course, referralUrl, language = "Hindi", channels = ["whatsapp", "facebook", "youtube"] }) {
  const title = clean(course.title, 160);
  const description = clean(course.description, 260);
  const price = Number(course.price);
  const currency = course.currency === "USD" ? "USD" : "INR";
  const priceLabel = price === 0
    ? (language === "Hindi" ? "मुफ़्त कोर्स" : "Free course")
    : new Intl.NumberFormat(language === "Hindi" ? "hi-IN" : "en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  const disclosure = language === "Hindi"
    ? "प्रकटीकरण: यह affiliate link है। इसके ज़रिए पात्र खरीद होने पर मुझे कमीशन मिल सकता है; आपकी कीमत नहीं बढ़ती।"
    : "Disclosure: This is an affiliate link. I may earn a commission from eligible purchases at no extra cost to you.";
  const safeUrl = String(referralUrl || "").slice(0, 500);
  const intro = language === "Hindi"
    ? \`SHIVASHA Learning Academy पर \${title} सीखें। \${description}\`
    : \`Explore \${title} on SHIVASHA Learning Academy. \${description}\`;
  const cta = language === "Hindi" ? "कोर्स की जानकारी यहाँ देखें:" : "View course details:";
  const copy = {
    whatsapp: language === "Hindi"
      ? \`📚 \${intro}\\n\\nस्तर: \${course.level} | भाषा: \${clean(course.language, 40)} | शुल्क: \${priceLabel}\\n\\n\${cta} \${safeUrl}\\n\\n\${disclosure}\`
      : \`📚 \${intro}\\n\\nLevel: \${course.level} | Language: \${clean(course.language, 40)} | Price: \${priceLabel}\\n\\n\${cta} \${safeUrl}\\n\\n\${disclosure}\`,
    facebook: language === "Hindi"
      ? \`\${intro}\\n\\nइस कोर्स में क्या सीखने को मिलेगा, इसकी पूरी जानकारी कोर्स पेज पर पढ़ें।\\n\${cta} \${safeUrl}\\n\\n\${disclosure}\`
      : \`\${intro}\\n\\nReview the course page for the full learning details and syllabus.\\n\${cta} \${safeUrl}\\n\\n\${disclosure}\`,
    youtube: language === "Hindi"
      ? \`वीडियो विवरण: \${title} – SHIVASHA Learning Academy\\n\\nइस कोर्स की जानकारी और उपलब्ध पाठ देखने के लिए: \${safeUrl}\\n\\n\${disclosure}\`
      : \`Video description: \${title} – SHIVASHA Learning Academy\\n\\nSee course details and available lessons: \${safeUrl}\\n\\n\${disclosure}\`
  };
  const selected = [...new Set(channels)].filter(channel => ["whatsapp", "facebook", "youtube"].includes(channel));
  return selected.map(channel => ({ channel, content: copy[channel], disclosure, referralUrl: safeUrl }));
}
