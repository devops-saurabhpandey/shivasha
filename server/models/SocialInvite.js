import mongoose from "mongoose";

const socialInviteSchema = new mongoose.Schema({
  resourceType: { type: String, enum: ["group", "community"], required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false, match: /^[a-f0-9]{64}$/ },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "redeemed", "revoked"], default: "pending", index: true },
  redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  redeemedAt: { type: Date, default: null }
}, { timestamps: true, strict: "throw" });

socialInviteSchema.index({ resourceType: 1, resourceId: 1, status: 1, expiresAt: 1 });
socialInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

export default mongoose.models.SocialInvite || mongoose.model("SocialInvite", socialInviteSchema);
