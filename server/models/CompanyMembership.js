import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "EnterpriseCompany", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: {
    type: String,
    required: true,
    enum: ["company_owner", "company_admin", "hr_manager", "finance_manager", "accountant", "auditor", "employee", "read_only"]
  },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: "throw" });

membershipSchema.index({ companyId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1, createdAt: -1 });
export default mongoose.models.EnterpriseCompanyMembership || mongoose.model("EnterpriseCompanyMembership", membershipSchema);
