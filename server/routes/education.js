import { Router } from "express";
import mongoose from "mongoose";
import EducationResource from "../models/EducationResource.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const BOARDS = new Set(["CBSE", "ICSE", "ISC"]);
const TYPES = new Set(["Textbooks", "Workbooks", "Reference Books", "Exam Preparation", "Digital Learning"]);
const SUBJECTS = new Set(["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"]);
const safeHttpUrl = value => {
  try { const url = new URL(String(value || "")); return ["https:", "http:"].includes(url.protocol) ? url.toString() : ""; }
  catch { return ""; }
};

router.get("/resources", requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.board && BOARDS.has(String(req.query.board))) filter.board = String(req.query.board);
    if (req.query.grade) {
      const grade = Number(req.query.grade);
      if (!Number.isInteger(grade) || grade < 1 || grade > 12) return res.status(400).json({ message: "Class must be from 1 to 12." });
      filter.grade = grade;
    }
    if (req.query.subject && SUBJECTS.has(String(req.query.subject))) filter.subject = String(req.query.subject);
    if (req.query.type && TYPES.has(String(req.query.type))) filter.resourceType = String(req.query.type);
    if (req.query.verified === "true") filter.verified = true;
    const resources = await EducationResource.find(filter).sort({ verified: -1, board: 1, grade: 1, subject: 1, title: 1 }).limit(100).lean();
    res.json({ resources, total: resources.length, message: resources.length ? "" : "No catalogue records yet. Add verified resources through the education admin workflow." });
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
    if (!BOARDS.has(board) || !Number.isInteger(grade) || grade < 1 || grade > 12 || !SUBJECTS.has(subject) || !TYPES.has(resourceType) || !title || !sourceUrl) {
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
      price: body.price === "" || body.price == null ? null : Math.max(0, Number(body.price)),
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
