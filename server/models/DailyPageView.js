import mongoose from "mongoose";

const dailyPageViewSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true, index: true },
  views: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

export default mongoose.model("DailyPageView", dailyPageViewSchema);
