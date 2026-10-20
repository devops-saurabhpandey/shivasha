import express from "express";

const router = express.Router();
const ASTRO = "https://astrotathya.com/api";
const ALLOWED_CITIES = new Set([
  "kanpur", "lucknow", "varanasi", "new-delhi", "prayagraj", "patna",
  "jaipur", "bhopal", "mumbai", "kolkata", "chennai", "bengaluru", "hyderabad"
]);

async function proxy(res, path) {
  try {
    const upstream = await fetch(ASTRO + path, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    const body = await upstream.text();
    let data;
    try { data = body ? JSON.parse(body) : {}; }
    catch { data = { error: "Calendar provider returned invalid JSON" }; }
    // Preserve 202 (calendar computing), 429 (rate limit), and upstream errors.
    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("Calendar provider request failed:", error.message);
    return res.status(502).json({
      error: "पंचांग सेवा से संपर्क नहीं हो पाया। कृपया कुछ देर बाद फिर कोशिश करें।",
      code: "calendar_provider_unavailable"
    });
  }
}

router.get("/panchang", (req, res) => {
  const city = String(req.query.city || "kanpur").toLowerCase();
  const date = String(req.query.date || "today");
  if (!ALLOWED_CITIES.has(city)) return res.status(400).json({ error: "Invalid city", code: "bad_city" });
  if (!(date === "today" || date === "tomorrow" || /^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return res.status(400).json({ error: "Invalid date", code: "bad_date" });
  }
  return proxy(res, "/panchang?city=" + encodeURIComponent(city) + "&date=" + encodeURIComponent(date));
});

router.get("/festivals", (req, res) => {
  const city = String(req.query.city || "kanpur").toLowerCase();
  const year = Number(req.query.year);
  if (!ALLOWED_CITIES.has(city)) return res.status(400).json({ error: "Invalid city", code: "bad_city" });
  if (!Number.isInteger(year) || year < 2025 || year > 2027) {
    return res.status(400).json({ error: "Year must be between 2025 and 2027", code: "bad_year" });
  }
  return proxy(res, "/festivals?city=" + encodeURIComponent(city) + "&year=" + year);
});

export default router;
