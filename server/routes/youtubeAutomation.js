import { Router } from "express";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
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
  if (req.body?.sceneAssets !== undefined) {
    if (!Array.isArray(req.body.sceneAssets) || req.body.sceneAssets.length > 30) return res.status(400).json({ message: "Scene assets must be an array with up to 30 items" });
    updates.sceneAssets = req.body.sceneAssets.map((item, index) => ({
      scene: Math.max(1, Math.min(30, Number(item?.scene) || index + 1)),
      type: ["video", "image"].includes(item?.type) ? item.type : "video",
      url: clean(item?.url, 2000),
      duration: Math.max(1, Math.min(600, Number(item?.duration) || 5)),
      attribution: clean(item?.attribution, 500)
    }));
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


router.post("/projects/:id/generate-script", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI is not configured. Add OPENAI_API_KEY to the backend environment." });
  try {
    const project = await YouTubeProject.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const prompt = `Write a complete, engaging YouTube video script in ${project.language} for the topic: ${project.topic}. Format: ${project.format === "short" ? "Short vertical video" : "Long-form video"}. Target duration: ${project.duration} seconds. Audience: ${project.audience || "general"}. Include a strong opening hook, clear narration, and a natural closing. Avoid fabricated facts and mark claims needing verification.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "You write accurate, engaging video scripts. Do not invent sources or facts." }, { role: "user", content: prompt }], max_tokens: 3500 })
      });
    } finally { clearTimeout(timeout); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ message: response.status === 429 ? "AI quota/rate limit reached. Try again later." : "AI script provider failed." });
    project.script = clean(payload.choices?.[0]?.message?.content, 30000);
    if (!project.script) return res.status(502).json({ message: "AI returned an empty script." });
    project.status = "Script ready";
    await project.save();
    res.json({ project, disclaimer: "Script generated and saved. Review factual claims before publishing." });
  } catch (error) {
    res.status(error.name === "AbortError" ? 504 : 502).json({ message: error.name === "AbortError" ? "Script generation timed out." : "Could not generate script. Please try again." });
  }
});

router.post("/projects/:id/generate-seo", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI is not configured. Add OPENAI_API_KEY to the backend environment." });
  try {
    const project = await YouTubeProject.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const prompt = `Create YouTube SEO metadata for this video. Return ONLY valid JSON with keys: title (one compelling, accurate title, max 100 characters), description (2-4 useful paragraphs with a concise call to action and relevant hashtags), tags (array of 8-15 relevant search tags, each max 50 characters). Do not use misleading clickbait. Language: ${project.language}. Format: ${project.format}. Topic: ${project.topic}. Audience: ${project.audience || "general"}.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "system", content: "You create accurate, audience-friendly YouTube metadata. Output strict JSON only." }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 900
        })
      });
    } finally { clearTimeout(timeout); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return res.status(status).json({ message: response.status === 429 ? "AI quota/rate limit reached. Try again later." : "AI metadata provider failed." });
    }
    const raw = payload.choices?.[0]?.message?.content || "{}";
    const metadata = JSON.parse(raw);
    project.title = clean(metadata.title, 160) || project.title;
    project.description = clean(metadata.description, 5000);
    project.tags = Array.isArray(metadata.tags) ? metadata.tags.slice(0, 30).map(tag => clean(tag, 50)).filter(Boolean) : [];
    await project.save();
    res.json({ project, disclaimer: "SEO metadata generated. Review it for accuracy before publishing." });
  } catch (error) {
    res.status(error.name === "AbortError" ? 504 : 502).json({ message: error.name === "AbortError" ? "AI metadata generation timed out." : "Could not generate SEO metadata. Please try again." });
  }
});


router.post("/projects/:id/generate-captions", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI is not configured. Add OPENAI_API_KEY to the backend environment." });
  try {
    const project = await YouTubeProject.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.script?.trim()) return res.status(400).json({ message: "Create or save a script first." });
    const prompt = `Create SRT subtitles from this script in ${project.language}, paced across approximately ${project.duration} seconds. Return only valid SRT with sequential indexes and timestamps HH:MM:SS,mmm. Keep captions concise and readable. Script:\n${project.script}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "Return only valid SRT subtitle text. Do not include markdown fences." }, { role: "user", content: prompt }], max_tokens: 4000 })
      });
    } finally { clearTimeout(timeout); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ message: response.status === 429 ? "AI quota/rate limit reached." : "AI caption provider failed." });
    const captions = clean(payload.choices?.[0]?.message?.content, 100000).replace(/^```(?:srt)?\s*/i, "").replace(/\s*```$/, "");
    if (!captions.includes("-->")) return res.status(502).json({ message: "AI returned invalid SRT captions." });
    project.captions = captions;
    await project.save();
    res.json({ project, disclaimer: "SRT captions generated. Review timing and wording before publishing." });
  } catch (error) {
    res.status(error.name === "AbortError" ? 504 : 502).json({ message: error.name === "AbortError" ? "Caption generation timed out." : "Could not generate captions." });
  }
});


router.post("/projects/:id/generate-voiceover", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI is not configured. Add OPENAI_API_KEY to the backend environment." });
  try {
    const project = await YouTubeProject.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const script = clean(project.script, 12000);
    if (!script) return res.status(400).json({ message: "Create or save a script first." });
    const voice = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(req.body?.voice) ? req.body.voice : "alloy";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || "tts-1", voice, input: script, response_format: "mp3" })
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      const providerError = await response.json().catch(() => ({}));
      return res.status(response.status === 429 ? 429 : 502).json({ message: response.status === 429 ? "AI quota/rate limit reached." : providerError.error?.message || "Voice-over provider failed." });
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) return res.status(502).json({ message: "AI returned empty audio." });
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
    if (cloudinaryConfigured) {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "video", folder: "shivasha/youtube-voiceovers", public_id: `project-${project._id}-${Date.now()}`, format: "mp3" }, (error, result) => error ? reject(error) : resolve(result));
        stream.end(audio);
      });
      project.voiceoverUrl = uploaded.secure_url;
      await project.save();
      return res.json({ voiceoverUrl: project.voiceoverUrl, stored: true, message: "Voice-over generated and stored in Cloudinary." });
    }
    res.set({ "Content-Type": "audio/mpeg", "Content-Disposition": `attachment; filename="${(project.title || "shivasha-voiceover").replace(/[^a-z0-9-_]/gi, "_").slice(0, 80)}.mp3`, "Cache-Control": "no-store" });
    res.send(audio);
  } catch (error) {
    if (!res.headersSent) res.status(error.name === "AbortError" ? 504 : 502).json({ message: error.name === "AbortError" ? "Voice-over generation timed out." : "Could not generate voice-over." });
  }
});

router.post("/projects/:id/generate-storyboard", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid project ID" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI is not configured. Add OPENAI_API_KEY to the backend environment." });
  try {
    const project = await YouTubeProject.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.script) return res.status(400).json({ message: "Generate or save a script first." });
    const prompt = `Create a practical video storyboard as strict JSON: {"scenes":[{"start":0,"end":5,"visual":"visual description","onScreenText":"short overlay","assetSearch":"search phrase for footage"}]}. Make scenes cover exactly about ${project.duration} seconds, use 3-8 scenes for Shorts and 8-24 for long videos, avoid copyrighted character/brand imitation, and keep visual prompts suitable for ${project.format === "short" ? "9:16 vertical" : "16:9 landscape"} video. Language: ${project.language}. Script: ${project.script}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "You are a video editor and storyboard planner. Return strict JSON only." }, { role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 2500 })
      });
    } finally { clearTimeout(timeout); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ message: response.status === 429 ? "AI quota/rate limit reached." : "Storyboard provider failed." });
    const raw = payload.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.scenes) || !parsed.scenes.length) return res.status(502).json({ message: "AI returned an empty storyboard." });
    project.storyboard = JSON.stringify(parsed.scenes.slice(0, 24), null, 2).slice(0, 30000);
    await project.save();
    res.json({ project, disclaimer: "Storyboard saved. This is a shot plan; video rendering and asset licensing are separate steps." });
  } catch (error) {
    res.status(error.name === "AbortError" ? 504 : 502).json({ message: error.name === "AbortError" ? "Storyboard generation timed out." : "Could not generate storyboard." });
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
