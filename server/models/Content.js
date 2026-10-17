import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: "", trim: true, maxlength: 4000 },
  type: { type: String, required: true, enum: ["article", "video", "reel", "image", "course", "live", "business"], index: true },
  purushartha: { type: String, required: true, enum: ["dharma", "artha", "kaam", "moksh"], index: true },
  house: { type: String, required: true, trim: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  thumbnailUrl: { type: String, default: "" },
  status: { type: String, enum: ["published", "draft"], default: "published", index: true }
}, { timestamps: true });

contentSchema.index({ status: 1, purushartha: 1, createdAt: -1 });
contentSchema.index({ house: 1, type: 1, createdAt: -1 });

export default mongoose.model("Content", contentSchema);
