import mongoose from "mongoose";
const replySchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, text: { type: String, required: true, trim: true, maxlength: 1000 } }, { timestamps: true, strict: "throw" });
const commentSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, text: { type: String, required: true, trim: true, maxlength: 1000 }, replies: { type: [replySchema], default: [] } }, { timestamps: true, strict: "throw" });
const schema = new mongoose.Schema({
 resourceType: { type: String, enum: ["group", "community"], required: true },
 resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
 authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
 text: { type: String, required: true, trim: true, minlength: 1, maxlength: 3000 },
 likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
 comments: { type: [commentSchema], default: [] },
 editedAt: { type: Date, default: null }
}, { timestamps: true, strict: "throw" });
schema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
schema.index({ authorId: 1, createdAt: -1 });
export default mongoose.models.SocialSpacePost || mongoose.model("SocialSpacePost", schema);
