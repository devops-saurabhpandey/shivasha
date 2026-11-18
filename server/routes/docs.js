import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const MAX_CONTENT_LENGTH = 100000;
const MAX_TITLE_LENGTH = 160;

const documentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: MAX_TITLE_LENGTH },
  // Plain text for the first release: avoids rendering untrusted HTML.
  content: { type: String, default: "", maxlength: MAX_CONTENT_LENGTH },
  revision: { type: Number, default: 1, min: 1 },
  deletedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

const Document = mongoose.models.ShivashaDocument ||
  mongoose.model("ShivashaDocument", documentSchema);

function validId(id) {
  return mongoose.isValidObjectId(id);
}

router.get("/", async (req, res, next) => {
  try {
    const documents = await Document.find({ owner: req.user.id, deletedAt: null })
      .select("title revision updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ documents });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
    if (!title) return res.status(400).json({ message: "Document title is required." });
    const document = await Document.create({ owner: req.user.id, title, content: "" });
    res.status(201).json({ document });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid document ID." });
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id, deletedAt: null }).lean();
    if (!document) return res.status(404).json({ message: "Document not found." });
    res.json({ document });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid document ID." });
    const { revision } = req.body || {};
    if (!Number.isInteger(revision) || revision < 1) {
      return res.status(400).json({ message: "A valid document revision is required." });
    }
    const update = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "title")) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ message: "Document title cannot be empty." });
      }
      update.title = req.body.title.trim().slice(0, MAX_TITLE_LENGTH);
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "content")) {
      if (typeof req.body.content !== "string" || req.body.content.length > MAX_CONTENT_LENGTH) {
        return res.status(413).json({ message: "Document content must be text up to 100,000 characters." });
      }
      update.content = req.body.content;
    }
    if (!Object.keys(update).length) return res.status(400).json({ message: "No document changes were provided." });

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, deletedAt: null, revision },
      { $set: update, $inc: { revision: 1 } },
      { new: true, runValidators: true }
    ).lean();
    if (document) return res.json({ document });

    const exists = await Document.exists({ _id: req.params.id, owner: req.user.id, deletedAt: null });
    if (!exists) return res.status(404).json({ message: "Document not found." });
    return res.status(409).json({ message: "This document changed elsewhere. Reload it before saving again." });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid document ID." });
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).select("_id").lean();
    if (!document) return res.status(404).json({ message: "Document not found." });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

export default router;
