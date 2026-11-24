import mongoose from "mongoose";

const communityMembershipSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: "SocialCommunity", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["owner", "admin", "moderator", "member"], default: "member", required: true },
  status: { type: String, enum: ["pending", "active", "removed", "banned"], default: "pending", required: true, index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  joinedAt: { type: Date, default: null }
}, { timestamps: true, strict: "throw" });

communityMembershipSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMembershipSchema.index({ userId: 1, status: 1, updatedAt: -1 });
export default mongoose.models.SocialCommunityMembership || mongoose.model("SocialCommunityMembership", communityMembershipSchema);
