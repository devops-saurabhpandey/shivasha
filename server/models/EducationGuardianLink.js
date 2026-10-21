import mongoose from "mongoose";

const educationGuardianLinkSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "approved", "revoked"], default: "pending", required: true },
  inviteHash: { type: String, required: true, unique: true, select: false },
  inviteExpiresAt: { type: Date, required: true },
  approvedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

educationGuardianLinkSchema.index({ student: 1, guardian: 1 }, { unique: true });

export default mongoose.model("EducationGuardianLink", educationGuardianLinkSchema);
