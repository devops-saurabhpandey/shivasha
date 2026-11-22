import mongoose from "mongoose";

const affiliateCommissionAuditSchema = new mongoose.Schema({
  commission: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliateCommission", required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, enum: ["created_pending_review", "approved", "reversed"], required: true },
  previousStatus: { type: String, enum: ["pending_review", "approved", "reversed", null], default: null },
  newStatus: { type: String, enum: ["pending_review", "approved", "reversed"], required: true },
  note: { type: String, trim: true, maxlength: 300, default: "" }
}, { timestamps: true });

affiliateCommissionAuditSchema.index({ commission: 1, createdAt: -1 });
export default mongoose.model("AffiliateCommissionAudit", affiliateCommissionAuditSchema);
