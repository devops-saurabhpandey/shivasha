import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import { HREmployee, HRAttendance, HRLeave } from "../models/HR.js";

const router = Router();
router.use(requireAuth);

async function requireHR(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user) return res.status(401).json({ message: "Account not found" });
    if (!["admin", "manager", "hr"].includes(user.role)) {
      return res.status(403).json({ message: "HR access required. Ask a Shivasha administrator to assign an HR or manager role." });
    }
    req.hrRole = user.role;
    next();
  } catch {
    res.status(500).json({ message: "Could not verify HR permissions" });
  }
}
router.use(requireHR);

const validId = id => mongoose.isValidObjectId(id);
const clean = (v, max=100) => typeof v === "string" ? v.trim().slice(0, max) : "";

router.get("/employees", async (req, res) => {
  try {
    const employees = await HREmployee.find().sort({ createdAt: -1 }).lean();
    res.json({ employees });
  } catch { res.status(500).json({ message: "Could not load employees" }); }
});

router.post("/employees", async (req, res) => {
  try {
    const employeeCode = clean(req.body?.employeeCode, 30);
    const name = clean(req.body?.name, 100);
    const monthlyGrossSalary = Number(req.body?.monthlyGrossSalary ?? 0);
    const annualCtc = Number(req.body?.annualCtc ?? (monthlyGrossSalary * 12));
    if (!employeeCode || !name) return res.status(400).json({ message: "Employee code and name are required" });
    if (!Number.isFinite(monthlyGrossSalary) || monthlyGrossSalary < 0 || monthlyGrossSalary > 100000000) return res.status(400).json({ message: "Invalid salary amount" });
    if (!Number.isFinite(annualCtc) || annualCtc < 0 || annualCtc > 1000000000) return res.status(400).json({ message: "Invalid annual CTC amount" });
    const components = {};
    for (const key of ["basicSalary","hra","da","otherAllowances"]) {
      const n = Number(req.body?.[key] ?? 0);
      if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ message: `Invalid ${key} amount` });
      components[key] = n;
    }
    const employee = await HREmployee.create({
      employeeCode, name, department: clean(req.body?.department, 80) || "Other",
      jobTitle: clean(req.body?.jobTitle, 80), workEmail: clean(req.body?.workEmail, 120).toLowerCase(),
      joiningDate: clean(req.body?.joiningDate, 10), monthlyGrossSalary, annualCtc, ...components,
      uan: clean(req.body?.uan, 12),
      pfWage: Number(req.body?.pfWage ?? components.basicSalary + components.da),
      epsWage: Number(req.body?.epsWage ?? 0),
      edliWage: Number(req.body?.edliWage ?? 0),
      ncpDays: Number(req.body?.ncpDays ?? 0),
      pfApplicable: req.body?.pfApplicable === true,
      esiApplicable: req.body?.esiApplicable === true,
      status: ["Active", "On leave", "Inactive"].includes(req.body?.status) ? req.body.status : "Active",
      createdBy: req.user.id
    });
    res.status(201).json({ employee });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Employee code already exists" });
    res.status(500).json({ message: "Could not create employee" });
  }
});

router.patch("/employees/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid employee ID" });
  try {
    const updates = {};
    for (const [key, max] of [["name",100],["department",80],["jobTitle",80],["workEmail",120],["joiningDate",10],["employeeCode",30]]) {
      if (typeof req.body?.[key] === "string") updates[key] = clean(req.body[key], max);
    }
    if (updates.workEmail) updates.workEmail = updates.workEmail.toLowerCase();
    if (req.body?.monthlyGrossSalary !== undefined) {
      const n = Number(req.body.monthlyGrossSalary);
      if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ message: "Invalid salary amount" });
      updates.monthlyGrossSalary = n;
    }
    for (const key of ["basicSalary","hra","da","otherAllowances"]) {
      if (req.body?.[key] !== undefined) {
        const n = Number(req.body[key]);
        if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ message: `Invalid ${key} amount` });
        updates[key] = n;
      }
    }
    for (const key of ["pfWage","epsWage","edliWage","ncpDays"]) {
      if (req.body?.[key] !== undefined) {
        const n = Number(req.body[key]);
        const max = key === "ncpDays" ? 31 : 100000000;
        if (!Number.isFinite(n) || n < 0 || n > max) return res.status(400).json({ message: `Invalid ${key} value` });
        updates[key] = n;
      }
    }
    if (req.body?.uan !== undefined) {
      const uan = clean(req.body.uan, 12);
      if (uan && !/^\\d{12}$/.test(uan)) return res.status(400).json({ message: "UAN must be 12 digits" });
      updates.uan = uan;
    }
    for (const key of ["pfApplicable","esiApplicable"]) {
      if (req.body?.[key] !== undefined) {
        if (typeof req.body[key] !== "boolean") return res.status(400).json({ message: `Invalid ${key} value` });
        updates[key] = req.body[key];
      }
    }
    if (req.body?.annualCtc !== undefined) {
      const n = Number(req.body.annualCtc);
      if (!Number.isFinite(n) || n < 0 || n > 1000000000) return res.status(400).json({ message: "Invalid annual CTC amount" });
      updates.annualCtc = n;
    }
    if (req.body?.status !== undefined) {
      if (!["Active","On leave","Inactive"].includes(req.body.status)) return res.status(400).json({ message: "Invalid employee status" });
      updates.status = req.body.status;
    }
    const employee = await HREmployee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ employee });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Employee code already exists" });
    res.status(500).json({ message: "Could not update employee" });
  }
});

router.delete("/employees/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid employee ID" });
  try {
    const employee = await HREmployee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    await Promise.all([HRAttendance.deleteMany({ employee: employee._id }), HRLeave.deleteMany({ employee: employee._id })]);
    res.json({ deleted: true });
  } catch { res.status(500).json({ message: "Could not delete employee" }); }
});

router.get("/attendance", async (_req, res) => {
  try { res.json({ attendance: await HRAttendance.find().populate("employee", "employeeCode name department").sort({ date: -1 }).limit(1000).lean() }); }
  catch { res.status(500).json({ message: "Could not load attendance" }); }
});

router.post("/attendance", async (req, res) => {
  const employeeId = String(req.body?.employeeId || "");
  const date = clean(req.body?.date, 10);
  const status = req.body?.status;
  if (!validId(employeeId)) return res.status(400).json({ message: "Valid employee is required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return res.status(400).json({ message: "Valid attendance date is required" });
  if (!["Present","Absent","Half day","Work from home","Holiday"].includes(status)) return res.status(400).json({ message: "Invalid attendance status" });
  try {
    if (!await HREmployee.exists({ _id: employeeId })) return res.status(404).json({ message: "Employee not found" });
    const record = await HRAttendance.findOneAndUpdate({ employee: employeeId, date }, {
      $set: { status, note: clean(req.body?.note, 160), recordedBy: req.user.id }
    }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).populate("employee", "employeeCode name department");
    res.status(200).json({ attendance: record });
  } catch { res.status(500).json({ message: "Could not save attendance" }); }
});

router.delete("/attendance/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid attendance ID" });
  try {
    const record = await HRAttendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Attendance record not found" });
    res.json({ deleted: true });
  } catch { res.status(500).json({ message: "Could not delete attendance" }); }
});

router.get("/leaves", async (_req, res) => {
  try { res.json({ leaves: await HRLeave.find().populate("employee", "employeeCode name department").sort({ createdAt: -1 }).limit(1000).lean() }); }
  catch { res.status(500).json({ message: "Could not load leave requests" }); }
});

router.post("/leaves", async (req, res) => {
  const employeeId = String(req.body?.employeeId || "");
  const from = clean(req.body?.from, 10), to = clean(req.body?.to, 10);
  const type = ["Casual","Sick","Earned","Unpaid","Other"].includes(req.body?.type) ? req.body.type : "Other";
  if (!validId(employeeId)) return res.status(400).json({ message: "Valid employee is required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return res.status(400).json({ message: "Valid leave date range is required" });
  try {
    if (!await HREmployee.exists({ _id: employeeId })) return res.status(404).json({ message: "Employee not found" });
    const leave = await HRLeave.create({ employee: employeeId, type, from, to, reason: clean(req.body?.reason, 200), requestedBy: req.user.id });
    res.status(201).json({ leave });
  } catch { res.status(500).json({ message: "Could not create leave request" }); }
});

router.patch("/leaves/:id/review", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid leave request ID" });
  const status = req.body?.status;
  if (!["Approved","Rejected"].includes(status)) return res.status(400).json({ message: "Status must be Approved or Rejected" });
  try {
    const leave = await HRLeave.findByIdAndUpdate(req.params.id, { status, reviewedBy: req.user.id, reviewedAt: new Date() }, { new: true, runValidators: true }).populate("employee", "employeeCode name department");
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ leave });
  } catch { res.status(500).json({ message: "Could not review leave request" }); }
});

export default router;
