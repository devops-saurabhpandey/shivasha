import mongoose from "mongoose";

const liveVideoSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, default: "SHIVASHA Live" },
  videoUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  durationSeconds: { type: Number, default: 0, min: 0 },
  bytes: { type: Number, default: 0, min: 0 },
  format: { type: String, default: "webm" }
}, { timestamps: true });

liveVideoSchema.index({ owner: 1, createdAt: -1 });
export default mongoose.model("LiveVideo", liveVideoSchema);
