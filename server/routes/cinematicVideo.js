import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import CinematicVideoJob from "../models/CinematicVideoJob.js";

const router = express.Router();
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ["video/mp4", "video/webm", "video/quicktime"].includes(file.mimetype);
    cb(ok ? null : new Error("Only MP4, WEBM or MOV videos are supported."), ok);
  }
});

async function uploadToCloudinary(file) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error("Video storage is not configured. Configure Cloudinary on the backend.");
    error.status = 503;
    throw error;
  }
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "shivasha/cinematic/source", resource_type: "video" },
      (error, result) => error ? reject(error) : resolve(result.secure_url));
    stream.end(file.buffer);
  });
}

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
    upload: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    cinematicGrading: "planned",
    backgroundReplacement: "planned",
    hairstyleEffects: "planned",
    audioProcessing: "planned",
    export: "planned"
  },
  message: "Video-processing worker is not connected yet."
}));

router.use(requireAuth);

router.post("/upload", videoUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a video file first." });
    const sourceUrl = await uploadToCloudinary(req.file);
    return res.status(201).json({ success: true, sourceUrl, message: "Video uploaded. Rendering worker is not connected yet." });
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message || "Video upload failed." });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const { sourceUrl = "", settings = {} } = req.body || {};
    if (typeof sourceUrl !== "string" || sourceUrl.length > 2048 || (sourceUrl && !sourceUrl.startsWith("https://"))) return res.status(400).json({ message: "Invalid sourceUrl" });
    const normalized = {
      look: allowedSettings.look.includes(settings.look) ? settings.look : "cinematic",
      intensity: Number.isFinite(Number(settings.intensity)) ? Math.max(0, Math.min(100, Number(settings.intensity))) : 65,
      background: allowedSettings.background.includes(settings.background) ? settings.background : "original",
      audio: allowedSettings.audio.includes(settings.audio) ? settings.audio : "original"
    };
    const job = await CinematicVideoJob.create({ userId: req.user.id, sourceUrl, settings: normalized });
    return res.status(201).json({ success: true, job: { id: job._id, status: job.status, progress: job.progress, settings: job.settings, createdAt: job.createdAt }, message: "Job queued. Rendering worker is not connected yet." });
  } catch {
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

router.use((error, _req, res, _next) => {
  const status = error.status || (error instanceof multer.MulterError ? 400 : 400);
  res.status(status).json({ message: error.message || "Cinematic video request failed." });
});

export default router;
