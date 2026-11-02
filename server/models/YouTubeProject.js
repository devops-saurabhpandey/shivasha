import mongoose from "mongoose";

const YouTubeProjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  topic: { type: String, required: true, trim: true, maxlength: 2000 },
  language: { type: String, default: "Hindi", trim: true, maxlength: 40 },
  format: { type: String, enum: ["short", "long"], required: true },
  duration: { type: Number, min: 15, max: 3600, default: 60 },
  audience: { type: String, trim: true, maxlength: 300, default: "" },
  status: { type: String, enum: ["Draft", "Script ready", "In review", "Approved", "Scheduled", "Published"], default: "Draft" },
  script: { type: String, maxlength: 30000, default: "" },
  captions: { type: String, maxlength: 100000, default: "" },
  voiceoverUrl: { type: String, maxlength: 2000, default: "" },
  storyboard: { type: String, maxlength: 30000, default: "" },
  renderStatus: { type: String, enum: ["idle", "queued", "running", "completed", "failed"], default: "idle" },
  renderOutputUrl: { type: String, maxlength: 2000, default: "" },
  renderError: { type: String, maxlength: 1000, default: "" },
  sceneAssets: { type: [{ scene: { type: Number, min: 1, max: 30 }, type: { type: String, enum: ["video", "image"], default: "video" }, url: { type: String, maxlength: 2000, default: "" }, duration: { type: Number, min: 1, max: 600, default: 5 }, attribution: { type: String, maxlength: 500, default: "" } }], default: [] },
  description: { type: String, maxlength: 5000, default: "" },
  tags: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.models.YouTubeProject || mongoose.model("YouTubeProject", YouTubeProjectSchema);
