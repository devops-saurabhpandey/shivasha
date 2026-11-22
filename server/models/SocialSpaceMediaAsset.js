import mongoose from "mongoose";
const schema = new mongoose.Schema({
 ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
 resourceType: { type: String, enum: ["group", "community"], required: true },
 resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
 mediaType: { type: String, enum: ["image", "video"], required: true },
 mimeType: { type: String, required: true },
 secureUrl: { type: String, required: true },
 publicId: { type: String, required: true },
 bytes: { type: Number, required: true, min: 1 },
 status: { type: String, enum: ["uploaded", "attached"], default: "uploaded", index: true },
 postId: { type: mongoose.Schema.Types.ObjectId, ref: "SocialSpacePost", default: null }
}, { timestamps: true, strict: "throw" });
schema.index({ ownerId: 1, resourceType: 1, resourceId: 1, status: 1 });
export default mongoose.models.SocialSpaceMediaAsset || mongoose.model("SocialSpaceMediaAsset", schema);
