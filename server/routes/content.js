import { Router } from "express";
import multer from "multer";
import Content from "../models/Content.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/quicktime"
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPG, PNG, WEBP, GIF, MP4, WEBM or MOV files are allowed"), allowed.includes(file.mimetype));
  }
});

const validCategories = new Set(["dharma", "artha", "kaam", "moksh"]);
const validTypes = new Set(["article", "video", "reel", "image", "course", "live", "business"]);
const HOUSE_CATEGORY = {
  "Self & Identity": "dharma", "Education & Creativity": "dharma", "Knowledge & Philosophy": "dharma",
  "Wealth & Finance": "artha", "Services & Wellbeing": "artha", "Career & Profession": "artha",
  "Skills & Communication": "kaam", "Business & Partnerships": "kaam", "Networks & Growth": "kaam",
  "Home & Property": "moksh", "Research & Transformation": "moksh", "Inner Growth & Global Reach": "moksh"
};
const safeTags = value => String(value || "").split(",").map(tag => tag.trim().replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 10).map(tag => tag.slice(0, 40));

async function uploadMedia(file, category) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const error = new Error("Media hosting is not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the backend environment.");
    error.status = 503;
    throw error;
  }
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: "shivasha/content/" + category,
      resource_type: resourceType,
      ...(resourceType === "image" ? { transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto", fetch_format: "auto" }] } : {})
    }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url, resourceType }));
    stream.end(file.buffer);
  });
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = { status: "published" };
    if (req.query.purushartha && validCategories.has(String(req.query.purushartha))) filter.purushartha = String(req.query.purushartha);
    if (req.query.house && req.query.house !== "All 12 Houses") filter.house = String(req.query.house);
    if (req.query.type && validTypes.has(String(req.query.type))) filter.type = String(req.query.type);
    if (req.query.mine === "true") filter.creator = req.user.id;
    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);
      if (q) filter.$or = [{ title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { description: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { tags: { $in: [q.toLowerCase()] } }];
    }
    const items = await Content.find(filter).populate("creator", "name avatarUrl").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.post("/", requireAuth, upload.single("media"), async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const type = String(req.body.type || "");
    const purushartha = String(req.body.purushartha || "");
    const house = String(req.body.house || "").trim();
    if (!title) return res.status(400).json({ message: "Title is required." });
    if (title.length > 140 || description.length > 4000) return res.status(400).json({ message: "Title or description is too long." });
    if (!validTypes.has(type)) return res.status(400).json({ message: "Choose a valid content type." });
    if (!validCategories.has(purushartha)) return res.status(400).json({ message: "Choose a valid Purushartha category." });
    if (HOUSE_CATEGORY[house] !== purushartha) return res.status(400).json({ message: "This House does not belong to the selected category." });
    if (["video", "reel", "business"].includes(type) && !req.file) return res.status(400).json({ message: "Choose a video file for this content type." });
    if (type === "image" && (!req.file || !req.file.mimetype.startsWith("image/"))) return res.status(400).json({ message: "Choose an image file." });
    if (["video", "reel", "business"].includes(type) && req.file && !req.file.mimetype.startsWith("video/")) return res.status(400).json({ message: "This content type needs a video file." });

    let media = { url: "", resourceType: "" };
    if (req.file) media = await uploadMedia(req.file, purushartha);
    const item = await Content.create({
      creator: req.user.id, title, description, type, purushartha, house,
      tags: safeTags(req.body.tags), mediaUrl: media.url, mediaType: media.resourceType,
      thumbnailUrl: media.resourceType === "image" ? media.url : ""
    });
    const populated = await Content.findById(item._id).populate("creator", "name avatarUrl").lean();
    res.status(201).json({ item: populated, message: "Content published successfully." });
  } catch (error) { next(error); }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Content not found." });
    if (item.creator.toString() !== req.user.id.toString()) return res.status(403).json({ message: "You can delete only your own content." });
    await item.deleteOne();
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  const status = error.status || (error instanceof multer.MulterError ? 400 : 400);
  res.status(status).json({ message: error.message || "Content request failed." });
});

export default router;
