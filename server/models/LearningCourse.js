import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", trim: true, maxlength: 1200 },
  videoUrl: { type: String, default: "", trim: true, maxlength: 1000 },
  durationMinutes: { type: Number, default: 0, min: 0, max: 1000 },
  order: { type: Number, required: true, min: 0, max: 500 }
}, { _id: true });

const learningCourseSchema = new mongoose.Schema({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, required: true, enum: ["technology", "business", "marketing", "finance", "education", "spirituality", "wellness", "other"], index: true },
  language: { type: String, default: "Hindi", trim: true, maxlength: 40 },
  level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
  price: { type: Number, required: true, min: 0, max: 1000000 },
  currency: { type: String, enum: ["INR", "USD"], default: "INR" },
  thumbnailUrl: { type: String, default: "", maxlength: 1000 },
  lessons: { type: [lessonSchema], default: [] },
  status: { type: String, enum: ["draft", "pending_review", "published", "rejected"], default: "pending_review", index: true },
  reviewNote: { type: String, default: "", maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

learningCourseSchema.index({ status: 1, category: 1, createdAt: -1 });
export default mongoose.model("LearningCourse", learningCourseSchema);
