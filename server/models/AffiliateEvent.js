import mongoose from "mongoose";

const affiliateEventSchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliatePartner", required: true, index: true },
  code: { type: String, required: true, uppercase: true, index: true },
  type: { type: String, enum: ["click", "enquiry"], required: true, index: true },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

affiliateEventSchema.index({ partner: 1, createdAt: -1 });
export default mongoose.model("AffiliateEvent", affiliateEventSchema);
