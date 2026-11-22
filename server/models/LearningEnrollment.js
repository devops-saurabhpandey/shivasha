import mongoose from "mongoose";

const learningEnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "LearningCourse", required: true, index: true },
  paymentStatus: { type: String, enum: ["free", "verified"], required: true },
  accessRevoked: { type: Boolean, default: false },
  transactionReference: { type: String, default: undefined, trim: true, maxlength: 120 },
  amountPaid: { type: Number, default: 0, min: 0 },
  progress: [{ lesson: { type: mongoose.Schema.Types.ObjectId, required: true }, completedAt: { type: Date, default: Date.now } }],
  certificateId: { type: String, default: undefined, unique: true, sparse: true },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

learningEnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
learningEnrollmentSchema.index({ transactionReference: 1 }, { unique: true, sparse: true });
export default mongoose.model("LearningEnrollment", learningEnrollmentSchema);
