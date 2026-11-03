import mongoose from "mongoose";

const cinematicVideoJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  sourceUrl: { type: String, default: "" },
  outputUrl: { type: String, default: "" },
  settings: {
    look: { type: String, enum: ["cinematic", "natural", "social", "custom"], default: "cinematic" },
    intensity: { type: Number, min: 0, max: 100, default: 65 },
    background: { type: String, enum: ["original", "blur", "studio", "custom"], default: "original" },
    audio: { type: String, enum: ["original", "enhance", "score"], default: "original" }
  },
  status: { type: String, enum: ["queued", "processing", "completed", "failed"], default: "queued", index: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  error: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

cinematicVideoJobSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.models.CinematicVideoJob || mongoose.model("CinematicVideoJob", cinematicVideoJobSchema);
