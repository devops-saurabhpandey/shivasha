import mongoose from "mongoose";

const socialSpaceChatMessageSchema = new mongoose.Schema({
  resourceType: { type: String, enum: ["group", "community"], required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true, strict: "throw" });

socialSpaceChatMessageSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
socialSpaceChatMessageSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.models.SocialSpaceChatMessage || mongoose.model("SocialSpaceChatMessage", socialSpaceChatMessageSchema);
