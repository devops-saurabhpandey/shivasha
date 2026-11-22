import mongoose from "mongoose";

const affiliatePartnerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  acceptedPolicyVersion: { type: String, required: true, maxlength: 40 },
  acceptedAt: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model("AffiliatePartner", affiliatePartnerSchema);
