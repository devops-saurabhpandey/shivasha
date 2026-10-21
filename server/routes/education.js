import { Router } from "express";
import mongoose from "mongoose";
import EducationResource from "../models/EducationResource.js";
import { BOARDS, SUBJECTS, TYPES, buildEducationResourceFilter } from "../utils/educationResourceFilters.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const safeHttpUrl = value => {
  try { const url = new URL(String(value || "")); return ["https:", "http:"].includes(url.protocol) ? url.toString() : ""; }
  catch { return ""; }
};

router.get("/resources", requireAuth, async (req, res, next) => {
  try {
    const parsed = buildEducationResourceFilter(req.query);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const filter = parsed.filter;

    // Students only see reviewed catalogue entries. Admins may explicitly
    // request pending or all entries for moderation.
    filter.verified = true;
    if (["false", "all"].includes(String(req.query.verified || ""))) {
      const user = await mongoose.model("User").findById(req.user.id).select("role");
      if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required to view pending resources." });
      if (req.query.verified === "false") filter.verified = false;
      else delete filter.verified;
    }

    const resources = await EducationResource.find(filter).sort({ verified: -1, board: 1, grade: 1, subject: 1, title: 1 }).limit(100).lean();
    res.json({ resources, total: resources.length, message: resources.length ? "" : "No matching verified catalogue records yet. Add and verify resources through the education admin workflow." });
  } catch (error) { next(error); }
});

router.post("/resources", requireAuth, async (req, res, next) => {
  try {
    const user = await mongoose.model("User").findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required to create catalogue entries." });
    const body = req.body || {};
    const board = String(body.board || "");
    const grade = Number(body.grade);
    const subject = String(body.subject || "");
    const resourceType = String(body.resourceType || "");
    const title = String(body.title || "").trim().slice(0, 180);
    const sourceUrl = safeHttpUrl(body.sourceUrl);
    const priceProvided = body.price !== "" && body.price != null;
    const price = priceProvided ? Number(body.price) : null;
    if (!BOARDS.has(board) || !Number.isInteger(grade) || grade < 1 || grade > 12 || !SUBJECTS.has(subject) || !TYPES.has(resourceType) || !title || !sourceUrl || (priceProvided && (!Number.isFinite(price) || price < 0))) {
      return res.status(400).json({ message: "Provide a valid board, class, subject, resource type, title and HTTP(S) source URL." });
    }
    const resource = await EducationResource.create({
      board, grade, subject, resourceType, title, sourceUrl,
      author: String(body.author || "").trim().slice(0, 160),
      publisher: String(body.publisher || "").trim().slice(0, 160),
      edition: String(body.edition || "").trim().slice(0, 80),
      language: String(body.language || "English").trim().slice(0, 50),
      academicYear: String(body.academicYear || "").trim().slice(0, 20),
      isbn: String(body.isbn || "").trim().slice(0, 24),
      price,
      currency: body.currency === "USD" ? "USD" : "INR",
      copyrightStatus: ["official-free", "authorized-listing", "permission-required", "unknown"].includes(body.copyrightStatus) ? body.copyrightStatus : "unknown",
      verified: false,
      createdBy: req.user.id
    });
    res.status(201).json({ resource, message: "Resource saved. It remains unverified until reviewed." });
  } catch (error) { next(error); }
});

router.patch("/resources/:id/verify", requireAuth, async (req, res, next) => {
  try {
    const user = await mongoose.model("User").findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid resource ID." });
    const resource = await EducationResource.findByIdAndUpdate(req.params.id, { verified: req.body?.verified === true }, { new: true, runValidators: true });
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    res.json({ resource });
  } catch (error) { next(error); }
});

router.delete("/resources/:id", requireAuth, async (req, res, next) => {
  try {
    const user = await mongoose.model("User").findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid resource ID." });
    const resource = await EducationResource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    res.json({ success: true, id: req.params.id });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => res.status(500).json({ message: error.message || "Education request failed." }));
export default router;
