import mongoose from "mongoose";

const educationStudentProfileSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  board: { type: String, enum: ["CBSE", "ICSE", "ISC"], required: true },
  grade: { type: Number, min: 1, max: 12, required: true },
  subject: { type: String, trim: true, maxlength: 80, required: true },
  dailyQuestionGoal: { type: Number, enum: [5, 10, 15, 20], default: 10 }
}, { timestamps: true });

export default mongoose.model("EducationStudentProfile", educationStudentProfileSchema);
