import mongoose from "mongoose";

const promptCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 90 },
  description: { type: String, default: "", trim: true, maxlength: 320 },
  icon: { type: String, default: "🧠", trim: true, maxlength: 12 },
  parentSlug: { type: String, default: "", trim: true, lowercase: true, maxlength: 90 },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

promptCategorySchema.index({ slug: 1 }, { unique: true });
promptCategorySchema.index({ active: 1, sortOrder: 1, name: 1 });

export default mongoose.model("PromptCategory", promptCategorySchema);
