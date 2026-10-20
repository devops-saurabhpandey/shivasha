import mongoose from "mongoose";

const educationQuestionSchema = new mongoose.Schema({
  board: { type: String, required: true, enum: ["CBSE", "ICSE", "ISC"], index: true },
  grade: { type: Number, required: true, min: 1, max: 12, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 80, index: true },
  chapter: { type: String, required: true, trim: true, maxlength: 160 },
  question: { type: String, required: true, trim: true, maxlength: 2000 },
  options: { type: [{ type: String, trim: true, maxlength: 500 }], validate: v => Array.isArray(v) && v.length >= 2 && v.length <= 6, required: true },
  answerIndex: { type: Number, required: true, min: 0 },
  explanation: { type: String, default: "", trim: true, maxlength: 2000 },
  sourceUrl: { type: String, default: "", trim: true, maxlength: 1000 },
  published: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

educationQuestionSchema.pre("validate", function(next) {
  if (this.answerIndex >= (this.options?.length || 0)) this.invalidate("answerIndex", "Answer index must match an option.");
  next();
});
educationQuestionSchema.index({ board: 1, grade: 1, subject: 1, published: 1 });
export default mongoose.model("EducationQuestion", educationQuestionSchema);
