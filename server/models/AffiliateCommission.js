import mongoose from "mongoose";

const affiliateCommissionSchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliatePartner", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  transactionReference: { type: String, required: true, trim: true, maxlength: 120, unique: true },
  grossAmount: { type: Number, required: true, min: 0.01, max: 1000000000 },
  ratePercent: { type: Number, required: true, min: 0, max: 50 },
  commissionAmount: { type: Number, required: true, min: 0, max: 500000000 },
  status: { type: String, enum: ["pending_review", "approved", "reversed"], default: "pending_review", index: true },
  productDescription: { type: String, required: true, trim: true, maxlength: 200 },
  verifiedAt: { type: Date, required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: "", maxlength: 300 }
}, { timestamps: true });

affiliateCommissionSchema.index({ partner: 1, createdAt: -1 });
export default mongoose.model("AffiliateCommission", affiliateCommissionSchema);
