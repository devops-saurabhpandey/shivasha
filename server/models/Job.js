import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 12000 },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  city: { type: String, trim: true, default: "Remote", maxlength: 100 },
  state: { type: String, trim: true, default: "", maxlength: 100 },
  country: { type: String, trim: true, default: "India" },
  skills: [{ type: String, trim: true, maxlength: 60 }],
  qualification: { type: String, trim: true, default: "" },
  experienceMin: { type: Number, min: 0, default: 0 },
  experienceMax: { type: Number, min: 0, default: 0 },
  workMode: { type: String, enum: ["onsite", "hybrid", "remote"], default: "onsite" },
  employmentType: { type: String, enum: ["full-time", "part-time", "contract", "internship"], default: "full-time" },
  salaryMin: { type: Number, min: 0, default: null },
  salaryMax: { type: Number, min: 0, default: null },
  currency: { type: String, default: "INR" },
  sourceType: { type: String, enum: ["shivasha", "external"], default: "shivasha" },
  sourceName: { type: String, default: "SHIVASHA" },
  sourceJobId: { type: String, default: "" },
  applyUrl: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["pending_review", "published", "rejected", "closed"], default: "pending_review" },
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

jobSchema.index({ status: 1, city: 1, workMode: 1, postedAt: -1 });
jobSchema.index({ title: "text", company: "text", description: "text", skills: "text" });

export default mongoose.models.Job || mongoose.model("Job", jobSchema);
