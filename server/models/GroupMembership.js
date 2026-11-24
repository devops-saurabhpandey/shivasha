import mongoose from "mongoose";

const groupMembershipSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "SocialGroup", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["owner", "admin", "moderator", "member"], default: "member", required: true },
  status: { type: String, enum: ["pending", "active", "removed", "banned"], default: "pending", required: true, index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  joinedAt: { type: Date, default: null }
}, { timestamps: true, strict: "throw" });

groupMembershipSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMembershipSchema.index({ userId: 1, status: 1, updatedAt: -1 });
export default mongoose.models.SocialGroupMembership || mongoose.model("SocialGroupMembership", groupMembershipSchema);
