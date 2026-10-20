import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  id: { type: String, enum: ["revise", "practice", "review"], required: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const studyPlanSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  board: { type: String, required: true, enum: ["CBSE", "ICSE", "ISC"] },
  grade: { type: Number, required: true, min: 1, max: 12 },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  planDate: { type: String, required: true, match: /^\\d{4}-\\d{2}-\\d{2}$/ },
  tasks: { type: [taskSchema], default: [] }
}, { timestamps: true });

studyPlanSchema.index({ student: 1, board: 1, grade: 1, subject: 1, planDate: 1 }, { unique: true });
export default mongoose.model("EducationStudyPlan", studyPlanSchema);
