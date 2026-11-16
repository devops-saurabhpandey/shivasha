import mongoose from "mongoose";

const promptVariableSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: "", trim: true, maxlength: 240 },
  required: { type: Boolean, default: false },
  defaultValue: { type: String, default: "", trim: true, maxlength: 500 }
}, { _id: false });

const promptSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 170 },
  summary: { type: String, required: true, trim: true, maxlength: 320 },
  body: { type: String, required: true, trim: true, maxlength: 12000 },
  instructions: { type: String, default: "", trim: true, maxlength: 3000 },
  exampleOutput: { type: String, default: "", trim: true, maxlength: 4000 },
  variables: { type: [promptVariableSchema], default: [] },
  category: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  subcategory: { type: String, default: "", trim: true, maxlength: 80 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  language: { type: String, enum: ["English", "Hindi", "Bilingual", "Other"], default: "English", index: true },
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  audience: { type: String, default: "Everyone", trim: true, maxlength: 100 },
  accessTier: { type: String, enum: ["free", "premium"], default: "free", index: true },
  status: { type: String, enum: ["draft", "pending", "published", "rejected", "archived"], default: "pending", index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: "", trim: true, maxlength: 500 },
  featured: { type: Boolean, default: false, index: true },
  views: { type: Number, default: 0, min: 0 },
  copies: { type: Number, default: 0, min: 0 },
  version: { type: Number, default: 1, min: 1 }
}, { timestamps: true });

promptSchema.index({ slug: 1 }, { unique: true });
promptSchema.index({ status: 1, category: 1, language: 1, accessTier: 1, createdAt: -1 });
promptSchema.index({ status: 1, featured: -1, copies: -1, createdAt: -1 });
promptSchema.index({ tags: 1, status: 1 });

export default mongoose.model("Prompt", promptSchema);
