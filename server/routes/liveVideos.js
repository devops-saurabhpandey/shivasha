import { Router } from "express";
import multer from "multer";
import LiveVideo from "../models/LiveVideo.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
// Limit memory use; recordings larger than 150 MB are rejected.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (["video/webm", "video/mp4", "video/ogg", "video/quicktime"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported video format. Use a browser-recorded WebM or MP4 video."));
  }
});

function cloudinaryClient() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Video storage is not configured yet. Add Cloudinary credentials in the Render environment.");
  }
  return import("cloudinary").then(({ v2 }) => {
    v2.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return v2;
  });
}

router.get("/", requireAuth, async (req, res) => {
  const videos = await LiveVideo.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ videos });
});

router.post("/upload", requireAuth, upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a recorded live video first." });
  let cloudinary;
  let uploaded;
  try {
    cloudinary = await cloudinaryClient();
    uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: "shivasha/live-videos",
        resource_type: "video",
        chunk_size: 6 * 1024 * 1024,
        timeout: 120000
      }, (error, result) => error ? reject(error) : resolve(result));
      stream.end(req.file.buffer);
    });
    const video = await LiveVideo.create({
      owner: req.user.id,
      title: String(req.body.title || "SHIVASHA Live").trim().slice(0, 120) || "SHIVASHA Live",
      videoUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      durationSeconds: Math.max(0, Number(req.body.durationSeconds) || 0),
      bytes: uploaded.bytes || req.file.size,
      format: uploaded.format || "webm"
    });
    res.status(201).json({ video, message: "Live video saved to My Live Videos." });
  } catch (error) {
    if (uploaded?.public_id && cloudinary) {
      try { await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "video" }); } catch {}
    }
    res.status(503).json({ message: error.message || "Could not save this live video." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const video = await LiveVideo.findOne({ _id: req.params.id, owner: req.user.id });
  if (!video) return res.status(404).json({ message: "Live video not found." });
  try {
    const cloudinary = await cloudinaryClient();
    await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });
    await video.deleteOne();
    res.json({ success: true, message: "Live video deleted." });
  } catch (error) {
    res.status(503).json({ message: error.message || "Could not delete the video from storage." });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Live video is larger than the 150 MB limit." });
  if (error) return res.status(400).json({ message: error.message || "Video upload failed." });
  res.status(500).json({ message: "Unexpected live-video error." });
});

export default router;
