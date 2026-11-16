import mongoose from "mongoose";

const promptReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  prompt: { type: mongoose.Schema.Types.ObjectId, ref: "Prompt", required: true },
  reason: { type: String, enum: ["spam", "copyright", "unsafe", "misleading", "other"], required: true },
  details: { type: String, default: "", trim: true, maxlength: 1000 },
  status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

promptReportSchema.index({ reporter: 1, prompt: 1 }, { unique: true });
promptReportSchema.index({ status: 1, createdAt: 1 });
export default mongoose.model("PromptReport", promptReportSchema);
