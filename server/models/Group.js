import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  privacy: { type: String, enum: ["public", "private", "invite-only"], default: "private", index: true },
  status: { type: String, enum: ["active", "paused", "archived"], default: "active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  coverImageUrl: { type: String, default: "", trim: true, maxlength: 2048 }
}, { timestamps: true, strict: "throw" });

groupSchema.index({ status: 1, privacy: 1, createdAt: -1 });
export default mongoose.models.SocialGroup || mongoose.model("SocialGroup", groupSchema);
