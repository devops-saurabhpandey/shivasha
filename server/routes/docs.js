import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const MAX_CONTENT_LENGTH = 100000;
const MAX_TITLE_LENGTH = 160;

const folderSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 }
}, { timestamps: true });
const Folder = mongoose.models.ShivashaDocFolder || mongoose.model("ShivashaDocFolder", folderSchema);

const documentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: MAX_TITLE_LENGTH },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaDocFolder", default: null, index: true },
  // Plain text for the first release: avoids rendering untrusted HTML.
  content: { type: String, default: "", maxlength: MAX_CONTENT_LENGTH },
  revision: { type: Number, default: 1, min: 1 },
  deletedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

const Document = mongoose.models.ShivashaDocument ||
  mongoose.model("ShivashaDocument", documentSchema);

const versionSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaDocument", required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, maxlength: MAX_TITLE_LENGTH },
  content: { type: String, default: "", maxlength: MAX_CONTENT_LENGTH },
  revision: { type: Number, required: true }
}, { timestamps: true });
const Version = mongoose.models.ShivashaDocVersion ||
  mongoose.model("ShivashaDocVersion", versionSchema);

function validId(id) {
  return mongoose.isValidObjectId(id);
}

router.get("/folders", async (req, res, next) => {
  try {
    const folders = await Folder.find({ owner: req.user.id }).sort({ name: 1 }).lean();
    res.json({ folders });
  } catch (error) { next(error); }
});

router.post("/folders", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ message: "Folder name is required." });
    if (name.length > 80) return res.status(400).json({ message: "Folder name must be 80 characters or fewer." });
    const folder = await Folder.create({ owner: req.user.id, name });
    res.status(201).json({ folder });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const filter = { owner: req.user.id, deletedAt: null };
    if (req.query.folder && req.query.folder !== "all") {
      if (req.query.folder === "none") filter.folder = null;
      else if (validId(req.query.folder)) filter.folder = req.query.folder;
      else return res.status(400).json({ message: "Invalid folder ID." });
    }
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const search = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    if (search) {
      const escaped = search.split("").map(char => "\\^$.*+?()[]{}|".includes(char) ? "\\" + char : char).join("");
  try {
    const filter = { owner: req.user.id, deletedAt: null };
    if (req.query.folder && req.query.folder !== "all") {
      if (req.query.folder === "none") filter.folder = null;
      else if (validId(req.query.folder)) filter.folder = req.query.folder;
      else return res.status(400).json({ message: "Invalid folder ID." });
    }
    const documents = await Document.find(filter)
      .select("title revision updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ documents });
  } catch (error) { next(error); }
});");
      filter.title = { $regex: escaped, $options: "i" };
    }
    const [documents, total] = await Promise.all([
      Document.find(filter).select("title revision updatedAt createdAt")
        .sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Document.countDocuments(filter)
    ]);
    res.json({ documents, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
    if (!title) return res.status(400).json({ message: "Document title is required." });
    let folder = null;
    if (req.body?.folderId) {
      if (!validId(req.body.folderId)) return res.status(400).json({ message: "Invalid folder ID." });
      folder = await Folder.findOne({ _id: req.body.folderId, owner: req.user.id }).select("_id").lean();
      if (!folder) return res.status(404).json({ message: "Folder not found." });
    }
    const document = await Document.create({ owner: req.user.id, title, content: "", folder: folder?._id || null });
    res.status(201).json({ document });
  } catch (error) { next(error); }
});


router.get("/:id/versions", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid document ID." });
    const owned = await Document.exists({ _id: req.params.id, owner: req.user.id, deletedAt: null });
    if (!owned) return res.status(404).json({ message: "Document not found." });
    const versions = await Version.find({ document: req.params.id, owner: req.user.id })
      .select("title revision createdAt")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ versions });
  } catch (error) { next(error); }
});

router.post("/:id/restore/:versionId", async (req, res, next) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.versionId)) {
      return res.status(400).json({ message: "Invalid document or version ID." });
    }
    const { revision } = req.body || {};
    if (!Number.isInteger(revision) || revision < 1) {
      return res.status(400).json({ message: "A valid current document revision is required." });
    }
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id, deletedAt: null, revision });
    if (!document) {
      const exists = await Document.exists({ _id: req.params.id, owner: req.user.id, deletedAt: null });
      return res.status(exists ? 409 : 404).json({ message: exists ? "This document changed elsewhere. Reload it before restoring." : "Document not found." });
    }
    const version = await Version.findOne({ _id: req.params.versionId, document: document._id, owner: req.user.id }).lean();
    if (!version) return res.status(404).json({ message: "Version not found." });
    await Version.create({ document: document._id, owner: req.user.id, title: document.title, content: document.content, revision: document.revision });
    document.title = version.title;
    document.content = version.content;
    document.revision += 1;
    await document.save();
    res.json({ document });
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
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "folderId")) {
      if (req.body.folderId === null || req.body.folderId === "") update.folder = null;
      else {
        if (!validId(req.body.folderId)) return res.status(400).json({ message: "Invalid folder ID." });
        const folder = await Folder.findOne({ _id: req.body.folderId, owner: req.user.id }).select("_id").lean();
        if (!folder) return res.status(404).json({ message: "Folder not found." });
        update.folder = folder._id;
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "content")) {
      if (typeof req.body.content !== "string" || req.body.content.length > MAX_CONTENT_LENGTH) {
        return res.status(413).json({ message: "Document content must be text up to 100,000 characters." });
      }
      update.content = req.body.content;
    }
    if (!Object.keys(update).length) return res.status(400).json({ message: "No document changes were provided." });

    const previous = await Document.findOne({ _id: req.params.id, owner: req.user.id, deletedAt: null, revision }).lean();
    if (previous && (Object.prototype.hasOwnProperty.call(update, "title") || Object.prototype.hasOwnProperty.call(update, "content"))) {
      await Version.create({ document: previous._id, owner: req.user.id, title: previous.title, content: previous.content, revision: previous.revision });
      const oldVersions = await Version.find({ document: previous._id, owner: req.user.id })
        .sort({ createdAt: -1 }).skip(30).select("_id").lean();
      if (oldVersions.length) await Version.deleteMany({ _id: { $in: oldVersions.map(item => item._id) }, owner: req.user.id });
    }

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
