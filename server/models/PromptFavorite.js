import mongoose from "mongoose";

const promptFavoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  prompt: { type: mongoose.Schema.Types.ObjectId, ref: "Prompt", required: true }
}, { timestamps: true });

promptFavoriteSchema.index({ user: 1, prompt: 1 }, { unique: true });
promptFavoriteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("PromptFavorite", promptFavoriteSchema);
