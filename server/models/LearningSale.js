import mongoose from "mongoose";

const learningSaleSchema = new mongoose.Schema({
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "LearningEnrollment", required: true, unique: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "LearningCourse", required: true, index: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  transactionReference: { type: String, required: true, trim: true, maxlength: 120, unique: true },
  currency: { type: String, enum: ["INR", "USD"], required: true },
  grossAmount: { type: Number, required: true, min: 0.01 },
  instructorRatePercent: { type: Number, required: true, min: 0, max: 100 },
  instructorAmount: { type: Number, required: true, min: 0 },
  affiliatePartner: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliatePartner", default: null, index: true },
  affiliateRatePercent: { type: Number, default: 0, min: 0, max: 50 },
  affiliateAmount: { type: Number, default: 0, min: 0 },
  platformAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["verified", "reversed"], default: "verified", index: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verifiedAt: { type: Date, default: Date.now },
  reviewNote: { type: String, default: "", maxlength: 300 }
}, { timestamps: true });

learningSaleSchema.index({ instructor: 1, createdAt: -1 });
learningSaleSchema.index({ affiliatePartner: 1, createdAt: -1 });
export default mongoose.model("LearningSale", learningSaleSchema);
