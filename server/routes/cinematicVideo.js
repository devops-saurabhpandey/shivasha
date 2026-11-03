import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CinematicVideoJob from "../models/CinematicVideoJob.js";

const router = express.Router();

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token || !process.env.JWT_SECRET) return res.status(401).json({ message: "Authentication required" });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
}

const allowedSettings = {
  look: ["cinematic", "natural", "social", "custom"],
  background: ["original", "blur", "studio", "custom"],
  audio: ["original", "enhance", "score"]
};

router.get("/capabilities", (_req, res) => res.json({
  success: true,
  editor: "prototype",
  jobApi: true,
  aiRendering: false,
  features: {
    upload: false,
    cinematicGrading: "planned",
    backgroundReplacement: "planned",
    hairstyleEffects: "planned",
    audioProcessing: "planned",
    export: "planned"
  },
  message: "Video-processing worker is not connected yet."
}));

router.use(requireAuth);

router.post("/jobs", async (req, res) => {
  try {
    const { sourceUrl = "", settings = {} } = req.body || {};
    if (typeof sourceUrl !== "string" || sourceUrl.length > 2048) return res.status(400).json({ message: "Invalid sourceUrl" });
    const normalized = {
      look: allowedSettings.look.includes(settings.look) ? settings.look : "cinematic",
      intensity: Number.isFinite(Number(settings.intensity)) ? Math.max(0, Math.min(100, Number(settings.intensity))) : 65,
      background: allowedSettings.background.includes(settings.background) ? settings.background : "original",
      audio: allowedSettings.audio.includes(settings.audio) ? settings.audio : "original"
    };
    const job = await CinematicVideoJob.create({ userId: req.user.id, sourceUrl, settings: normalized });
    return res.status(201).json({ success: true, job: { id: job._id, status: job.status, progress: job.progress, settings: job.settings, createdAt: job.createdAt }, message: "Job queued. Rendering worker is not connected yet." });
  } catch (error) {
    return res.status(500).json({ message: "Could not create video job" });
  }
});

router.get("/jobs", async (req, res) => {
  try {
    const jobs = await CinematicVideoJob.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(30).lean();
    return res.json({ success: true, jobs: jobs.map(({ _id, status, progress, settings, outputUrl, error, createdAt, updatedAt }) => ({ id: _id, status, progress, settings, outputUrl, error, createdAt, updatedAt })) });
  } catch {
    return res.status(500).json({ message: "Could not load video jobs" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid job ID" });
  try {
    const job = await CinematicVideoJob.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!job) return res.status(404).json({ message: "Video job not found" });
    return res.json({ success: true, job: { id: job._id, status: job.status, progress: job.progress, settings: job.settings, outputUrl: job.outputUrl, error: job.error, createdAt: job.createdAt, updatedAt: job.updatedAt } });
  } catch {
    return res.status(500).json({ message: "Could not load video job" });
  }
});

export default router;
