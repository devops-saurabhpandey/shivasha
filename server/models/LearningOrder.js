import mongoose from "mongoose";

const learningOrderSchema = new mongoose.Schema({
  orderReference: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "LearningCourse", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01, max: 1000000 },
  currency: { type: String, enum: ["INR", "USD"], required: true },
  status: { type: String, enum: ["awaiting_payment", "paid", "cancelled", "refund_pending", "refunded"], default: "awaiting_payment", index: true },
  provider: { type: String, enum: ["unconfigured", "manual_reconciliation"], default: "unconfigured" },
  transactionReference: { type: String, trim: true, maxlength: 120, default: undefined, unique: true, sparse: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  verifiedAt: { type: Date, default: null },
  refundNote: { type: String, default: "", maxlength: 300 }
}, { timestamps: true });

learningOrderSchema.index({ student: 1, course: 1, status: 1 });
export default mongoose.model("LearningOrder", learningOrderSchema);
