import mongoose from "mongoose";

const affiliateCommissionLedgerSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaMarketplaceOrder", required: true, immutable: true },
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true, index: true },
  orderAmount: { type: Number, required: true, min: 0, immutable: true },
  currency: { type: String, enum: ["USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"], required: true, immutable: true },
  platformFeePercent: { type: Number, required: true, min: 0, max: 30, immutable: true },
  platformFeeAmount: { type: Number, required: true, min: 0, immutable: true },
  affiliateSharePercent: { type: Number, required: true, min: 0, max: 100, immutable: true },
  commissionAmount: { type: Number, required: true, min: 0, immutable: true },
  // Kept private: never return the external transaction reference to affiliates.
  paymentReferenceKey: { type: String, required: true, select: false, immutable: true },
  status: { type: String, enum: ["Pending", "Accrued", "Reversed"], default: "Pending", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  accruedAt: { type: Date, default: null },
  reversedAt: { type: Date, default: null },
  reversalReason: { type: String, default: "", maxlength: 500 }
}, { timestamps: true });

affiliateCommissionLedgerSchema.index({ order: 1 }, { unique: true });
affiliateCommissionLedgerSchema.index({ paymentReferenceKey: 1 }, { unique: true });
affiliateCommissionLedgerSchema.index({ affiliate: 1, status: 1, createdAt: -1 });

const AffiliateCommissionLedger = mongoose.models.ShivashaAffiliateCommissionLedger ||
  mongoose.model("ShivashaAffiliateCommissionLedger", affiliateCommissionLedgerSchema);

export default AffiliateCommissionLedger;
