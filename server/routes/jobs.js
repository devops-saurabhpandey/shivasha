import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";

const router = express.Router();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const pageSize = Math.max(1, Math.min(50, Number.parseInt(req.query.pageSize, 10) || 12));
    const filter = { status: "published", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    const query = String(req.query.query || "").trim().slice(0, 100);
    const city = String(req.query.city || "").trim().slice(0, 100);
    const workMode = String(req.query.workMode || "").toLowerCase();
    const experience = String(req.query.experience || "").toLowerCase();
    const qualification = String(req.query.qualification || "").trim().slice(0, 100);

    if (query) {
      const rx = new RegExp(escapeRegex(query), "i");
      filter.$and = [{ $or: [{ title: rx }, { company: rx }, { description: rx }, { skills: rx }] }];
    }
    if (city && !["all", "all india"].includes(city.toLowerCase())) {
      filter.$or = [{ city: new RegExp(escapeRegex(city), "i") }, { workMode: "remote" }];
    }
    if (["onsite", "hybrid", "remote"].includes(workMode)) filter.workMode = workMode;
    if (experience === "fresher" || experience === "0") filter.experienceMin = { $lte: 0 };
    if (experience === "1-3") filter.experienceMin = { $lte: 1 }, filter.experienceMax = { $gte: 1 };
    if (qualification) filter.qualification = new RegExp(escapeRegex(qualification), "i");

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ postedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      Job.countDocuments(filter)
    ]);
    res.json({ success: true, jobs, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error("Job search error:", error.message);
    res.status(500).json({ success: false, message: "Could not search jobs" });
  }
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid job ID" });
  try {
    const job = await Job.findOne({ _id: req.params.id, status: "published" }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found or no longer available" });
    res.json({ success: true, job });
  } catch {
    res.status(500).json({ success: false, message: "Could not load job" });
  }
});

export default router;
