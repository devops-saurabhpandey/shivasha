import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import YouTubeProject from "../models/YouTubeProject.js";

const router = Router();
router.use(requireAuth);

const clean = (value, max = 2000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validId = id => mongoose.isValidObjectId(id);

router.get("/projects", async (req, res) => {
  try {
    const projects = await YouTubeProject.find({ user: req.user.id }).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ projects });
  } catch {
    res.status(500).json({ message: "Could not load YouTube projects" });
  }
});

router.post("/projects", async (req, res) => {
  const topic = clean(req.body?.topic);
  const format = req.body?.format;
  const language = clean(req.body?.language, 40) || "Hindi";
  const duration = Number(req.body?.duration ?? (format === "short" ? 60 : 300));
  if (!topic) return res.status(400).json({ message: "Video topic is required" });
  if (!["short", "long"].includes(format)) return res.status(400).json({ message: "Format must be short or long" });
  if (!Number.isFinite(duration) || duration < 15 || duration > 3600) return res.status(400).json({ message: "Duration must be between 15 and 3600 seconds" });
  try {
    const project = await YouTubeProject.create({
      user: req.user.id,
      title: clean(req.body?.title, 160) || topic.slice(0, 160),
      topic, format, language, duration,
      audience: clean(req.body?.audience, 300)
    });
    res.status(201).json({ project });
  } catch {
    res.status(500).json({ message: "Could not create YouTube project" });
  }
});

router.patch("/projects/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const allowed = ["title", "topic", "language", "audience", "script", "description", "status"];
  const updates = {};
  for (const key of allowed) {
    if (typeof req.body?.[key] === "string") updates[key] = clean(req.body[key], key === "script" ? 30000 : key === "description" ? 5000 : key === "topic" ? 2000 : key === "title" ? 160 : 300);
  }
  if (req.body?.duration !== undefined) {
    const duration = Number(req.body.duration);
    if (!Number.isFinite(duration) || duration < 15 || duration > 3600) return res.status(400).json({ message: "Invalid duration" });
    updates.duration = duration;
  }
  if (req.body?.format !== undefined) {
    if (!["short", "long"].includes(req.body.format)) return res.status(400).json({ message: "Invalid format" });
    updates.format = req.body.format;
  }
  if (req.body?.tags !== undefined) {
    if (!Array.isArray(req.body.tags)) return res.status(400).json({ message: "Tags must be an array" });
    updates.tags = req.body.tags.slice(0, 30).map(tag => clean(tag, 50)).filter(Boolean);
  }
  if (updates.status && !["Draft", "Script ready", "In review", "Approved", "Scheduled", "Published"].includes(updates.status)) return res.status(400).json({ message: "Invalid project status" });
  try {
    const project = await YouTubeProject.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: updates }, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ project });
  } catch {
    res.status(500).json({ message: "Could not update project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  try {
    const result = await YouTubeProject.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!result) return res.status(404).json({ message: "Project not found" });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ message: "Could not delete project" });
  }
});

export default router;
