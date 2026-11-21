import mongoose from "mongoose";

const affiliatePayoutRequestSchema = new mongoose.Schema({
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true, index: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaAffiliatePayoutDestination", required: true, immutable: true },
  destinationLabel: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
  currency: { type: String, enum: ["USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"], required: true, immutable: true },
  amount: { type: Number, required: true, min: 0.01, immutable: true },
  ledgerEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShivashaAffiliateCommissionLedger", required: true, immutable: true }],
  status: { type: String, enum: ["Requested", "Approved", "Rejected", "Paid"], default: "Requested", index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
  requestedAt: { type: Date, default: Date.now, immutable: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: "", maxlength: 500 },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  paidAt: { type: Date, default: null },
  // External transfer reference is private and is only recorded after a manual transfer.
  transferReference: { type: String, default: "", maxlength: 120, select: false },
  transferReferenceKey: { type: String, default: "", maxlength: 120, select: false }
}, { timestamps: true });

affiliatePayoutRequestSchema.index({ affiliate: 1, idempotencyKey: 1 }, { unique: true });
affiliatePayoutRequestSchema.index({ transferReferenceKey: 1 }, { unique: true, sparse: true });
affiliatePayoutRequestSchema.index({ status: 1, createdAt: 1 });

const AffiliatePayoutRequest = mongoose.models.ShivashaAffiliatePayoutRequest ||
  mongoose.model("ShivashaAffiliatePayoutRequest", affiliatePayoutRequestSchema);

export default AffiliatePayoutRequest;
