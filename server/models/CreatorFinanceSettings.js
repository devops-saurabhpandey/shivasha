import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true, immutable: true },
  creatorPoolPercent: { type: Number, default: 10, min: 0, max: 100 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.model("CreatorFinanceSettings", settingsSchema);
