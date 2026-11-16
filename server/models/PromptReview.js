import mongoose from "mongoose";

const promptReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  prompt: { type: mongoose.Schema.Types.ObjectId, ref: "Prompt", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: "", trim: true, maxlength: 800 },
  status: { type: String, enum: ["published", "hidden"], default: "published" }
}, { timestamps: true });

promptReviewSchema.index({ user: 1, prompt: 1 }, { unique: true });
promptReviewSchema.index({ prompt: 1, status: 1, createdAt: -1 });
export default mongoose.model("PromptReview", promptReviewSchema);
