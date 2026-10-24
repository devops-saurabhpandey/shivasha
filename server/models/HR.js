import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, default: "Other", trim: true, maxlength: 80 },
  jobTitle: { type: String, default: "", trim: true, maxlength: 80 },
  workEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
  joiningDate: { type: String, default: "" },
  uan: { type: String, default: "", trim: true, match: [/^$|^\d{12}$/, "UAN must be 12 digits"] },
  pfWage: { type: Number, default: 0, min: 0, max: 100000000 },
  epsWage: { type: Number, default: 0, min: 0, max: 100000000 },
  edliWage: { type: Number, default: 0, min: 0, max: 100000000 },
  ncpDays: { type: Number, default: 0, min: 0, max: 31 },
  monthlyGrossSalary: { type: Number, default: 0, min: 0, max: 100000000 },
  annualCtc: { type: Number, default: 0, min: 0, max: 1000000000 },
  basicSalary: { type: Number, default: 0, min: 0, max: 100000000 },
  hra: { type: Number, default: 0, min: 0, max: 100000000 },
  da: { type: Number, default: 0, min: 0, max: 100000000 },
  otherAllowances: { type: Number, default: 0, min: 0, max: 100000000 },
  pfApplicable: { type: Boolean, default: false },
  esiApplicable: { type: Boolean, default: false },
  status: { type: String, enum: ["Active", "On leave", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
employeeSchema.index({ employeeCode: 1 }, { unique: true });

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "HREmployee", required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent", "Half day", "Work from home", "Holiday"], required: true },
  note: { type: String, default: "", maxlength: 160 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "HREmployee", required: true },
  type: { type: String, enum: ["Casual", "Sick", "Earned", "Unpaid", "Other"], default: "Casual" },
  from: { type: String, required: true },
  to: { type: String, required: true },
  reason: { type: String, default: "", maxlength: 200 },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export const HREmployee = mongoose.models.HREmployee || mongoose.model("HREmployee", employeeSchema);
export const HRAttendance = mongoose.models.HRAttendance || mongoose.model("HRAttendance", attendanceSchema);
export const HRLeave = mongoose.models.HRLeave || mongoose.model("HRLeave", leaveSchema);

const challanSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^\\d{4}-\\d{2}$/ },
  type: { type: String, enum: ["PF", "ESIC", "Other"], default: "PF" },
  amount: { type: Number, required: true, min: 0, max: 1000000000 },
  status: { type: String, enum: ["Draft", "Generated", "Paid", "Pending"], default: "Draft" },
  reference: { type: String, default: "", trim: true, maxlength: 100 },
  notes: { type: String, default: "", trim: true, maxlength: 200 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
challanSchema.index({ month: 1, type: 1 });
export const HRChallan = mongoose.models.HRChallan || mongoose.model("HRChallan", challanSchema);


const payrollRunSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^\\d{4}-\\d{2}$/ },
  status: { type: String, enum: ["Draft", "Approved", "Paid"], default: "Draft" },
  employeeCount: { type: Number, min: 0, required: true },
  totals: {
    gross: { type: Number, default: 0, min: 0 },
    employeePF: { type: Number, default: 0, min: 0 },
    employerPF: { type: Number, default: 0, min: 0 },
    employeeESIC: { type: Number, default: 0, min: 0 },
    employerESIC: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, default: 0 }
  },
  records: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HREmployee" },
    employeeCode: { type: String, required: true, maxlength: 30 },
    name: { type: String, required: true, maxlength: 100 },
    uan: { type: String, default: "", maxlength: 12 },
    gross: { type: Number, min: 0, required: true },
    pfWage: { type: Number, min: 0, required: true },
    employeePF: { type: Number, min: 0, required: true },
    employerPF: { type: Number, min: 0, required: true },
    employeeESIC: { type: Number, min: 0, required: true },
    employerESIC: { type: Number, min: 0, required: true },
    netPay: { type: Number, required: true }
  }]
}, { timestamps: true });
payrollRunSchema.index({ month: 1 }, { unique: true });
export const HRPayrollRun = mongoose.models.HRPayrollRun || mongoose.model("HRPayrollRun", payrollRunSchema);
