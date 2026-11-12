import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "EnterpriseCompany", required: true, index: true, immutable: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  action: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
  resourceType: { type: String, required: true, trim: true, maxlength: 80, immutable: true },
  resourceId: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
  occurredAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { versionKey: false, strict: "throw" });

auditEventSchema.index({ companyId: 1, occurredAt: -1 });
auditEventSchema.index({ companyId: 1, resourceType: 1, resourceId: 1, occurredAt: -1 });
export default mongoose.models.EnterpriseAuditEvent || mongoose.model("EnterpriseAuditEvent", auditEventSchema);
