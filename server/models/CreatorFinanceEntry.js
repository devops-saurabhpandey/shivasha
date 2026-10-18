import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
  type: { type: String, enum: ["revenue", "expense", "liability", "allocation", "payout"], required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: "INR", immutable: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  reference: { type: String, default: "", trim: true, maxlength: 120 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

entrySchema.index({ type: 1, createdAt: -1 });
export default mongoose.model("CreatorFinanceEntry", entrySchema);
