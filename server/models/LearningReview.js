import mongoose from "mongoose";

const learningReviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "LearningCourse", required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "LearningEnrollment", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: "", trim: true, maxlength: 100 },
  comment: { type: String, required: true, trim: true, maxlength: 1500 },
  status: { type: String, enum: ["pending_review", "published", "rejected"], default: "pending_review", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

learningReviewSchema.index({ course: 1, student: 1 }, { unique: true });
learningReviewSchema.index({ course: 1, status: 1, createdAt: -1 });
export default mongoose.model("LearningReview", learningReviewSchema);
