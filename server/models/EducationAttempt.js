import mongoose from "mongoose";

const educationAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  board: { type: String, required: true, enum: ["CBSE", "ICSE", "ISC"] },
  grade: { type: Number, required: true, min: 1, max: 12 },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  answers: [{ question: { type: mongoose.Schema.Types.ObjectId, ref: "EducationQuestion", required: true }, chapter: { type: String, trim: true, maxlength: 160, default: "" }, selectedIndex: { type: Number, required: true, min: 0 }, correct: { type: Boolean, required: true }, questionText: { type: String, maxlength: 2000, default: "" }, optionsSnapshot: { type: [String], default: [] }, correctIndexSnapshot: { type: Number, min: 0, default: null }, explanationSnapshot: { type: String, maxlength: 2000, default: "" } }],
  totalQuestions: { type: Number, required: true, min: 1 },
  correctCount: { type: Number, required: true, min: 0 },
  scorePercent: { type: Number, required: true, min: 0, max: 100 }
}, { timestamps: true });

educationAttemptSchema.index({ student: 1, createdAt: -1 });
export default mongoose.model("EducationAttempt", educationAttemptSchema);
