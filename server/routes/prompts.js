import { Router } from "express";
import mongoose from "mongoose";
import Prompt from "../models/Prompt.js";
import PromptCategory from "../models/PromptCategory.js";
import PromptFavorite from "../models/PromptFavorite.js";
import PromptCollection from "../models/PromptCollection.js";
import PromptReview from "../models/PromptReview.js";
import PromptReport from "../models/PromptReport.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const generatorWindows = new Map();
const slugify = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const allowedLanguages = new Set(["English", "Hindi", "Bilingual", "Other"]);
const allowedDifficulties = new Set(["Beginner", "Intermediate", "Advanced"]);
const cleanTags = value => (Array.isArray(value) ? value : []).map(tag => String(tag).trim().toLowerCase().replace(/^#/, "").slice(0, 40)).filter(Boolean).slice(0, 12);

async function isAdmin(userId) {
  const User = mongoose.model("User");
  const user = await User.findById(userId).select("role").lean();
  return user?.role === "admin";
}

function validatePrompt(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const promptBody = typeof body.body === "string" ? body.body.trim() : "";
  const category = typeof body.category === "string" ? slugify(body.category) : "";
  if (!title || title.length > 140) return { error: "Title is required and must be 140 characters or fewer." };
  if (!summary || summary.length > 320) return { error: "Summary is required and must be 320 characters or fewer." };
  if (!promptBody || promptBody.length > 12000) return { error: "Prompt text is required and must be 12,000 characters or fewer." };
  if (!category) return { error: "A valid category is required." };
  const language = allowedLanguages.has(body.language) ? body.language : "English";
  const difficulty = allowedDifficulties.has(body.difficulty) ? body.difficulty : "Beginner";
  const variables = Array.isArray(body.variables) ? body.variables.slice(0, 20).map(item => ({
    name: String(item?.name || "").trim().slice(0, 60),
    description: String(item?.description || "").trim().slice(0, 240),
    required: Boolean(item?.required),
    defaultValue: String(item?.defaultValue || "").trim().slice(0, 500)
  })).filter(item => item.name) : [];
  return { value: {
    title, summary, body: promptBody, category,
    subcategory: String(body.subcategory || "").trim().slice(0, 80),
    instructions: String(body.instructions || "").trim().slice(0, 3000),
    exampleOutput: String(body.exampleOutput || "").trim().slice(0, 4000),
    tags: cleanTags(body.tags), language, difficulty,
    audience: String(body.audience || "Everyone").trim().slice(0, 100),
    variables
  }};
}

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await PromptCategory.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ categories });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { status: "published" };
    const category = slugify(req.query.category);
    if (category) filter.category = category;
    if (allowedLanguages.has(req.query.language)) filter.language = req.query.language;
    if (["free", "premium"].includes(req.query.accessTier)) filter.accessTier = req.query.accessTier;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.tag) filter.tags = String(req.query.tag).trim().toLowerCase().slice(0, 40);
    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);
      if (q) {
        const regex = new RegExp(escapeRegex(q), "i");
        filter.$or = [{ title: regex }, { summary: regex }, { body: regex }, { tags: regex }];
      }
    }
    const [items, total] = await Promise.all([
      Prompt.find(filter).select("-body -instructions -exampleOutput -reviewNote -reviewedBy").sort({ featured: -1, copies: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Prompt.countDocuments(filter)
    ]);
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await Prompt.find({ author: req.user.id }).sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    const favorites = await PromptFavorite.find({ user: req.user.id }).populate({ path: "prompt", match: { status: "published" } }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ items: favorites.map(item => item.prompt).filter(Boolean) });
  } catch (error) { next(error); }
});


router.get("/collections/me", requireAuth, async (req, res, next) => {
  try {
    const items = await PromptCollection.find({ owner: req.user.id }).populate({ path: "prompts", match: { status: "published" }, select: "title slug summary category language accessTier" }).sort({ updatedAt: -1 }).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.post("/collections", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name || name.length > 80) return res.status(400).json({ message: "Collection name is required (maximum 80 characters)." });
    const ids = Array.isArray(req.body.promptIds) ? [...new Set(req.body.promptIds.map(String))].slice(0, 100) : [];
    if (ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: "One or more prompt IDs are invalid." });
    const prompts = ids.length ? await Prompt.find({ _id: { $in: ids }, status: "published" }).select("_id") : [];
    const item = await PromptCollection.create({ owner: req.user.id, name, description: String(req.body.description || "").trim().slice(0, 300), visibility: req.body.visibility === "public" ? "public" : "private", prompts: prompts.map(p => p._id) });
    res.status(201).json({ item });
  } catch (error) { next(error); }
});

router.get("/collections/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid collection ID." });
    const item = await PromptCollection.findById(req.params.id).populate({ path: "prompts", match: { status: "published" }, select: "title slug summary category language accessTier" }).lean();
    if (!item || item.visibility !== "public") return res.status(404).json({ message: "Public collection not found." });
    res.json({ item });
  } catch (error) { next(error); }
});

router.patch("/collections/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid collection ID." });
    const item = await PromptCollection.findOne({ _id: req.params.id, owner: req.user.id });
    if (!item) return res.status(404).json({ message: "Collection not found." });
    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (!name || name.length > 80) return res.status(400).json({ message: "Collection name must be 1–80 characters." });
      item.name = name;
    }
    if (typeof req.body.description === "string") item.description = req.body.description.trim().slice(0, 300);
    if (["private", "public"].includes(req.body.visibility)) item.visibility = req.body.visibility;
    if (Array.isArray(req.body.promptIds)) {
      const ids = [...new Set(req.body.promptIds.map(String))].slice(0, 100);
      if (ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: "One or more prompt IDs are invalid." });
      const prompts = ids.length ? await Prompt.find({ _id: { $in: ids }, status: "published" }).select("_id") : [];
      item.prompts = prompts.map(p => p._id);
    }
    await item.save();
    res.json({ item });
  } catch (error) { next(error); }
});

router.delete("/collections/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid collection ID." });
    const result = await PromptCollection.deleteOne({ _id: req.params.id, owner: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: "Collection not found." });
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post("/generate", requireAuth, async (req, res) => {
  const purpose = typeof req.body?.purpose === "string" ? req.body.purpose.trim().slice(0, 600) : "";
  if (!purpose) return res.status(400).json({ message: "Describe what you want the prompt to accomplish." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ code: "PROMPT_GENERATOR_NOT_CONFIGURED", message: "Prompt Generator is not configured. The administrator must add OPENAI_API_KEY to the private API environment." });
  const now = Date.now();
  const key = String(req.user.id);
  const window = generatorWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) generatorWindows.set(key, { startedAt: now, count: 1 });
  else if (++window.count > 5) return res.status(429).json({ message: "Prompt Generator limit reached. Try again in one minute." });
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Create a high-quality reusable AI prompt. Return only a JSON object with title, summary, body, instructions, and tags (array). Do not include secrets, illegal instructions, deceptive claims, or medical diagnosis/treatment instructions. Write in the requested language." },
          { role: "user", content: JSON.stringify({ purpose, category: String(req.body.category || "general-languages").slice(0, 80), language: allowedLanguages.has(req.body.language) ? req.body.language : "English", audience: String(req.body.audience || "Everyone").slice(0, 100) }) }
        ]
      }),
      signal: AbortSignal.timeout(45_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Prompt generator provider error:", upstream.status, data?.error?.code || "unknown");
      return res.status(502).json({ message: "AI prompt generation failed. Check the server provider configuration and quota." });
    }
    const raw = data?.choices?.[0]?.message?.content || "{}";
    const generated = JSON.parse(raw);
    if (typeof generated.title !== "string" || typeof generated.body !== "string" || !generated.body.trim()) return res.status(502).json({ message: "AI returned an incomplete prompt. Please retry." });
    res.json({ prompt: { title: generated.title.slice(0, 140), summary: String(generated.summary || "").slice(0, 320), body: generated.body.slice(0, 12000), instructions: String(generated.instructions || "").slice(0, 3000), tags: cleanTags(generated.tags) }, disclaimer: "Review and edit the generated prompt before submitting it." });
  } catch (error) {
    console.error("Prompt generator request failed:", error?.name || "Error");
    res.status(502).json({ message: "Could not generate a prompt right now. Please try again." });
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const prompt = await Prompt.findOne({ slug: String(req.params.slug).toLowerCase(), status: "published" }).select("-reviewNote -reviewedBy");
    if (!prompt) return res.status(404).json({ message: "Prompt not found." });
    if (prompt.accessTier === "premium") {
      const token = String(req.headers.authorization || "").startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
      if (!token) return res.status(403).json({ code: "PREMIUM_REQUIRED", message: "This prompt requires premium access." });
      try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const User = mongoose.model("User");
        const user = await User.findById(decoded.id).select("role").lean();
        if (!user || user.role !== "admin") return res.status(403).json({ code: "PREMIUM_REQUIRED", message: "Premium access is not enabled for this account." });
      } catch { return res.status(401).json({ message: "Invalid or expired token." }); }
    }
    prompt.views += 1;
    await prompt.save();
    res.json({ item: prompt });
  } catch (error) { next(error); }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = validatePrompt(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const admin = await isAdmin(req.user.id);
    const requestedStatus = ["draft", "pending"].includes(req.body.status) ? req.body.status : "pending";
    const item = await Prompt.create({ ...parsed.value, slug: slugify(parsed.value.title) + "-" + new mongoose.Types.ObjectId().toString().slice(-6), author: req.user.id, status: admin && req.body.status === "published" ? "published" : requestedStatus, accessTier: admin && req.body.accessTier === "premium" ? "premium" : "free", featured: admin && req.body.featured === true });
    res.status(201).json({ item, message: item.status === "published" ? "Prompt published." : "Prompt saved for review." });
  } catch (error) { next(error); }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const item = await Prompt.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Prompt not found." });
    const admin = await isAdmin(req.user.id);
    if (!admin && item.author.toString() !== req.user.id.toString()) return res.status(403).json({ message: "You can edit only your own prompts." });
    const parsed = validatePrompt({ ...item.toObject(), ...req.body });
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    Object.assign(item, parsed.value, { version: item.version + 1 });
    if (admin && ["free", "premium"].includes(req.body.accessTier)) item.accessTier = req.body.accessTier;
    if (admin && typeof req.body.featured === "boolean") item.featured = req.body.featured;
    if (!admin && item.status === "published") item.status = "pending";
    if (admin && ["draft", "pending", "published", "rejected", "archived"].includes(req.body.status)) item.status = req.body.status;
    await item.save();
    res.json({ item, message: "Prompt updated." });
  } catch (error) { next(error); }
});

router.post("/:id/favorite", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const prompt = await Prompt.findOne({ _id: req.params.id, status: "published" }).select("_id");
    if (!prompt) return res.status(404).json({ message: "Published prompt not found." });
    await PromptFavorite.updateOne({ user: req.user.id, prompt: prompt._id }, { $setOnInsert: { user: req.user.id, prompt: prompt._id } }, { upsert: true });
    res.json({ success: true, favorited: true });
  } catch (error) { next(error); }
});

router.delete("/:id/favorite", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    await PromptFavorite.deleteOne({ user: req.user.id, prompt: req.params.id });
    res.json({ success: true, favorited: false });
  } catch (error) { next(error); }
});

router.post("/:id/copy", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const prompt = await Prompt.findOneAndUpdate({ _id: req.params.id, status: "published", accessTier: "free" }, { $inc: { copies: 1 } }, { new: true }).select("_id copies");
    if (!prompt) return res.status(404).json({ message: "Free published prompt not found." });
    res.json({ success: true, copies: prompt.copies });
  } catch (error) { next(error); }
});

router.get("/admin/review", requireAuth, async (req, res, next) => {
  try {
    if (!await isAdmin(req.user.id)) return res.status(403).json({ message: "Admin access required." });
    const items = await Prompt.find({ status: "pending" }).populate("author", "name email").sort({ createdAt: 1 }).limit(100).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.patch("/admin/:id/review", requireAuth, async (req, res, next) => {
  try {
    if (!await isAdmin(req.user.id)) return res.status(403).json({ message: "Admin access required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const status = String(req.body.status || "");
    if (!["published", "rejected", "archived"].includes(status)) return res.status(400).json({ message: "Invalid review status." });
    const item = await Prompt.findByIdAndUpdate(req.params.id, { $set: { status, reviewedBy: req.user.id, reviewNote: String(req.body.reviewNote || "").trim().slice(0, 500) } }, { new: true, runValidators: true }).populate("author", "name email");
    if (!item) return res.status(404).json({ message: "Prompt not found." });
    res.json({ item, message: "Prompt review saved." });
  } catch (error) { next(error); }
});


router.get("/:id/reviews", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const [items, stats] = await Promise.all([
      PromptReview.find({ prompt: req.params.id, status: "published" }).populate("user", "name avatarUrl").sort({ createdAt: -1 }).limit(50).lean(),
      PromptReview.aggregate([{ $match: { prompt: new mongoose.Types.ObjectId(req.params.id), status: "published" } }, { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }])
    ]);
    res.json({ items, averageRating: stats[0]?.average || 0, total: stats[0]?.count || 0 });
  } catch (error) { next(error); }
});

router.post("/:id/reviews", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
    const prompt = await Prompt.findOne({ _id: req.params.id, status: "published" }).select("_id");
    if (!prompt) return res.status(404).json({ message: "Published prompt not found." });
    const item = await PromptReview.findOneAndUpdate(
      { user: req.user.id, prompt: prompt._id },
      { $set: { rating, text: String(req.body.text || "").trim().slice(0, 800), status: "published" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ item });
  } catch (error) { next(error); }
});

router.post("/:id/reports", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid prompt ID." });
    const reason = String(req.body?.reason || "");
    if (!["spam", "copyright", "unsafe", "misleading", "other"].includes(reason)) return res.status(400).json({ message: "Choose a valid report reason." });
    const prompt = await Prompt.findOne({ _id: req.params.id, status: "published" }).select("_id");
    if (!prompt) return res.status(404).json({ message: "Published prompt not found." });
    const existing = await PromptReport.findOne({ reporter: req.user.id, prompt: prompt._id }).select("_id");
    if (existing) return res.status(409).json({ message: "You have already reported this prompt." });
    await PromptReport.create({ reporter: req.user.id, prompt: prompt._id, reason, details: String(req.body.details || "").trim().slice(0, 1000) });
    res.status(201).json({ success: true, message: "Report sent to the moderation team." });
  } catch (error) { next(error); }
});

router.get("/admin/reports", requireAuth, async (req, res, next) => {
  try {
    if (!await isAdmin(req.user.id)) return res.status(403).json({ message: "Admin access required." });
    const items = await PromptReport.find({ status: "open" }).populate("reporter", "name email").populate("prompt", "title slug").sort({ createdAt: 1 }).limit(100).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.patch("/admin/reports/:id", requireAuth, async (req, res, next) => {
  try {
    if (!await isAdmin(req.user.id)) return res.status(403).json({ message: "Admin access required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid report ID." });
    const status = String(req.body.status || "");
    if (!["reviewed", "dismissed"].includes(status)) return res.status(400).json({ message: "Invalid report status." });
    const item = await PromptReport.findByIdAndUpdate(req.params.id, { $set: { status, resolvedBy: req.user.id } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Report not found." });
    res.json({ item });
  } catch (error) { next(error); }
});

export default router;
