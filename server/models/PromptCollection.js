import mongoose from "mongoose";

const promptCollectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", trim: true, maxlength: 300 },
  visibility: { type: String, enum: ["private", "public"], default: "private" },
  prompts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Prompt" }]
}, { timestamps: true });

promptCollectionSchema.index({ owner: 1, updatedAt: -1 });
export default mongoose.model("PromptCollection", promptCollectionSchema);
