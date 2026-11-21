import mongoose from "mongoose";

const affiliatePayoutDestinationSchema = new mongoose.Schema({
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true, immutable: true },
  maskedDestination: { type: String, required: true, trim: true, maxlength: 100 },
  verificationNote: { type: String, default: "", trim: true, maxlength: 500 },
  status: { type: String, enum: ["Verified", "Revoked"], default: "Verified", index: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const AffiliatePayoutDestination = mongoose.models.ShivashaAffiliatePayoutDestination ||
  mongoose.model("ShivashaAffiliatePayoutDestination", affiliatePayoutDestinationSchema);

export default AffiliatePayoutDestination;
