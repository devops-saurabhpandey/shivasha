import express from "express";
import DailyPageView from "../models/DailyPageView.js";

const router = express.Router();

// Lightweight, privacy-conscious aggregate analytics: no IP, email, cookie ID,
// referrer, or full query string is stored. Counts are daily page-view totals.
router.post("/pageview", async (_req, res, next) => {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const result = await DailyPageView.findOneAndUpdate(
      { day },
      { $inc: { views: 1 }, $setOnInsert: { day } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.status(202).json({ recorded: true, day: result.day });
  } catch (error) { next(error); }
});

router.get("/summary", async (_req, res, next) => {
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 6);
    const startDay = since.toISOString().slice(0, 10);
    const rows = await DailyPageView.find({ day: { $gte: startDay } }).sort({ day: 1 }).lean();
    const byDay = new Map(rows.map(row => [row.day, row.views]));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - i);
      const day = date.toISOString().slice(0, 10);
      days.push({ day, views: byDay.get(day) || 0 });
    }
    res.json({ periodDays: 7, totalPageViews: days.reduce((sum, row) => sum + row.views, 0), days,
      note: "Page views are aggregate counts, not unique visitors or social-platform follower counts." });
  } catch (error) { next(error); }
});

export default router;
