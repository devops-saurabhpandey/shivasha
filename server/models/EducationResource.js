import mongoose from "mongoose";

const educationResourceSchema = new mongoose.Schema({
  board: { type: String, required: true, enum: ["CBSE", "ICSE", "ISC"], index: true },
  grade: { type: Number, required: true, min: 1, max: 12, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 80, index: true },
  resourceType: { type: String, required: true, enum: ["Textbooks", "Workbooks", "Reference Books", "Exam Preparation", "Digital Learning"], index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  author: { type: String, default: "", trim: true, maxlength: 160 },
  publisher: { type: String, default: "", trim: true, maxlength: 160 },
  edition: { type: String, default: "", trim: true, maxlength: 80 },
  language: { type: String, default: "English", trim: true, maxlength: 50 },
  academicYear: { type: String, default: "", trim: true, maxlength: 20 },
  isbn: { type: String, default: "", trim: true, maxlength: 24 },
  sourceUrl: { type: String, required: true, trim: true, maxlength: 1000 },
  price: { type: Number, min: 0, default: null },
  currency: { type: String, default: "INR", enum: ["INR", "USD"] },
  copyrightStatus: { type: String, enum: ["official-free", "authorized-listing", "permission-required", "unknown"], default: "unknown" },
  verified: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

educationResourceSchema.index({ board: 1, grade: 1, subject: 1, resourceType: 1 });
export default mongoose.model("EducationResource", educationResourceSchema);
