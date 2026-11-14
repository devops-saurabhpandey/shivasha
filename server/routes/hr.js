import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import { hasCompanyPermission } from "../enterprise/companyConfig.js";
import { createHRCompanyAuthorizationMiddleware } from "../enterprise/hrAuthorization.js";
import { validatePayrollTransition } from "../enterprise/payrollWorkflow.js";
import { MAX_PENDING_HR_AUDIT_EVENTS, createHRAuditEvent, flushHRAuditOutboxForDocument, withHRAuditCapacity } from "../enterprise/hrAuditOutbox.js";
import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";
import { buildMonthlyPayrollRegister } from "../../src/hrPayrollRegister.js";

const router = Router();
router.use(requireAuth);

const validId = id => mongoose.isValidObjectId(id);

const requireHRCompany = createHRCompanyAuthorizationMiddleware({ CompanyModel: Company, MembershipModel: CompanyMembership });
router.use(requireHRCompany);
const clean = (v, max=100) => typeof v === "string" ? v.trim().slice(0, max) : "";

const makeAudit = (req, action, resourceType, resourceId, details = {}) =>
  createHRAuditEvent({
    companyId: req.companyId,
    actorUserId: req.user.id,
    action,
    resourceType,
    resourceId,
    details
  });

async function respondWithAudit(res, Model, documentId, event, body, successStatus = 200) {
  const result = await flushHRAuditOutboxForDocument(Model, documentId);
  return res.status(result.recorded ? successStatus : 202).json({
    ...body,
    audit: {
      status: result.recorded ? "recorded" : "pending",
      eventId: String(event.eventId),
      pendingEvents: result.pending,
      ...(result.recorded ? {} : {
        message: "The HR change is saved and its audit event is durably queued for retry. Do not resubmit this mutation."
      })
    }
  });
}

async function respondNotFoundOrAuditBacklog(res, Model, filter, message) {
  const exists = await Model.exists(filter);
  if (exists) {
    return res.status(503).json({
      message: "The HR audit outbox is at capacity. No change was applied; retry after audit recovery."
    });
  }
  return res.status(404).json({ message });
}

router.get("/employees", async (req, res) => {
  try {
    const employees = await HREmployee.find({ companyId: req.companyId, deletedAt: null }).sort({ createdAt: -1 }).lean();
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
      if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ message: "Invalid " + key + " amount" });
      components[key] = n;
    }
    const id = new mongoose.Types.ObjectId();
    const event = makeAudit(req, "hr.employee.created", "employee", id, {
      changedFields: ["employeeCode", "name", "department", "jobTitle", "workEmail", "salary", "statutoryFlags"]
    });
    const employee = await HREmployee.create({
      _id: id,
      companyId: req.companyId, employeeCode, name, department: clean(req.body?.department, 80) || "Other",
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
      createdBy: req.user.id,
      auditOutbox: [event]
    });
    return respondWithAudit(res, HREmployee, employee._id, event, { employee }, 201);
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
        if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ message: "Invalid " + key + " amount" });
        updates[key] = n;
      }
    }
    for (const key of ["pfWage","epsWage","edliWage","ncpDays"]) {
      if (req.body?.[key] !== undefined) {
        const n = Number(req.body[key]);
        const max = key === "ncpDays" ? 31 : 100000000;
        if (!Number.isFinite(n) || n < 0 || n > max) return res.status(400).json({ message: "Invalid " + key + " value" });
        updates[key] = n;
      }
    }
    if (req.body?.uan !== undefined) {
      const uan = clean(req.body.uan, 12);
      if (uan && !/^\d{12}$/.test(uan)) return res.status(400).json({ message: "UAN must be 12 digits" });
      updates.uan = uan;
    }
    for (const key of ["pfApplicable","esiApplicable"]) {
      if (req.body?.[key] !== undefined) {
        if (typeof req.body[key] !== "boolean") return res.status(400).json({ message: "Invalid " + key + " value" });
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
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No supported employee fields supplied" });
    const event = makeAudit(req, "hr.employee.updated", "employee", req.params.id, { changedFields: Object.keys(updates) });
    const employee = await HREmployee.findOneAndUpdate(
      withHRAuditCapacity({ _id: req.params.id, companyId: req.companyId, deletedAt: null }),
      { $set: updates, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!employee) return respondNotFoundOrAuditBacklog(
      res, HREmployee, { _id: req.params.id, companyId: req.companyId, deletedAt: null }, "Employee not found"
    );
    return respondWithAudit(res, HREmployee, employee._id, event, { employee });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Employee code already exists" });
    res.status(500).json({ message: "Could not update employee" });
  }
});

router.delete("/employees/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid employee ID" });
  try {
    const filter = { _id: req.params.id, companyId: req.companyId, deletedAt: null };
    const event = makeAudit(req, "hr.employee.archived", "employee", req.params.id, { changedFields: ["deletedAt", "deletedBy"] });
    const employee = await HREmployee.findOneAndUpdate(
      withHRAuditCapacity(filter),
      { $set: { deletedAt: new Date(), deletedBy: req.user.id }, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!employee) return respondNotFoundOrAuditBacklog(res, HREmployee, filter, "Employee not found");
    // Archive instead of cascading physical deletes so attendance, leave and
    // payroll evidence remains available for reconciliation and audit.
    return respondWithAudit(res, HREmployee, employee._id, event, { deleted: true, archived: true });
  } catch {
    res.status(500).json({ message: "Could not archive employee" });
  }
});

router.get("/attendance", async (req, res) => {
  try { res.json({ attendance: await HRAttendance.find({ companyId: req.companyId, deletedAt: null }).populate("employee", "employeeCode name department").sort({ date: -1 }).limit(1000).lean() }); }
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
    if (!await HREmployee.exists({ _id: employeeId, companyId: req.companyId, deletedAt: null })) return res.status(404).json({ message: "Employee not found" });
    const existing = await HRAttendance.findOne({ companyId: req.companyId, employee: employeeId, date });
    const id = existing?._id || new mongoose.Types.ObjectId();
    const event = makeAudit(req, "hr.attendance.saved", "attendance", id, {
      date, changedFields: ["status", "note", "recordedBy"]
    });
    let record;
    if (existing) {
      record = await HRAttendance.findOneAndUpdate(
        withHRAuditCapacity({ _id: existing._id, companyId: req.companyId }),
        { $set: { status, note: clean(req.body?.note, 160), recordedBy: req.user.id, deletedAt: null, deletedBy: null }, $push: { auditOutbox: event } },
        { new: true, runValidators: true }
      );
      if (!record) return res.status(503).json({ message: "The HR audit outbox is at capacity. No attendance change was applied; retry after audit recovery." });
    } else {
      record = await HRAttendance.create({
        _id: id, companyId: req.companyId, employee: employeeId, date, status,
        note: clean(req.body?.note, 160), recordedBy: req.user.id, auditOutbox: [event]
      });
    }
    await record.populate("employee", "employeeCode name department");
    return respondWithAudit(res, HRAttendance, record._id, event, { attendance: record }, existing ? 200 : 201);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Attendance was changed concurrently. Refresh and retry." });
    res.status(500).json({ message: "Could not save attendance" });
  }
});

router.delete("/attendance/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid attendance ID" });
  try {
    const filter = { _id: req.params.id, companyId: req.companyId, deletedAt: null };
    const event = makeAudit(req, "hr.attendance.archived", "attendance", req.params.id, { changedFields: ["deletedAt", "deletedBy"] });
    const record = await HRAttendance.findOneAndUpdate(
      withHRAuditCapacity(filter),
      { $set: { deletedAt: new Date(), deletedBy: req.user.id }, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!record) return respondNotFoundOrAuditBacklog(res, HRAttendance, filter, "Attendance record not found");
    return respondWithAudit(res, HRAttendance, record._id, event, { deleted: true, archived: true });
  } catch {
    res.status(500).json({ message: "Could not archive attendance record" });
  }
});

router.get("/leaves", async (req, res) => {
  try { res.json({ leaves: await HRLeave.find({ companyId: req.companyId, deletedAt: null }).populate("employee", "employeeCode name department").sort({ createdAt: -1 }).limit(1000).lean() }); }
  catch { res.status(500).json({ message: "Could not load leave requests" }); }
});

router.post("/leaves", async (req, res) => {
  const employeeId = String(req.body?.employeeId || "");
  const from = clean(req.body?.from, 10), to = clean(req.body?.to, 10);
  const type = ["Casual","Sick","Earned","Unpaid","Other"].includes(req.body?.type) ? req.body.type : "Other";
  if (!validId(employeeId)) return res.status(400).json({ message: "Valid employee is required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return res.status(400).json({ message: "Valid leave date range is required" });
  try {
    if (!await HREmployee.exists({ _id: employeeId, companyId: req.companyId, deletedAt: null })) return res.status(404).json({ message: "Employee not found" });
    const id = new mongoose.Types.ObjectId();
    const event = makeAudit(req, "hr.leave.created", "leave", id, {
      leaveType: type, changedFields: ["employee", "type", "from", "to", "reason", "status"]
    });
    const leave = await HRLeave.create({
      _id: id, companyId: req.companyId, employee: employeeId, type, from, to,
      reason: clean(req.body?.reason, 200), requestedBy: req.user.id, auditOutbox: [event]
    });
    return respondWithAudit(res, HRLeave, leave._id, event, { leave }, 201);
  } catch {
    res.status(500).json({ message: "Could not create leave request" });
  }
});

router.patch("/leaves/:id/review", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid leave request ID" });
  const status = req.body?.status;
  if (!["Approved","Rejected"].includes(status)) return res.status(400).json({ message: "Status must be Approved or Rejected" });
  try {
    const filter = { _id: req.params.id, companyId: req.companyId, deletedAt: null };
    const event = makeAudit(req, "hr.leave.reviewed", "leave", req.params.id, {
      status, changedFields: ["status", "reviewedBy", "reviewedAt"]
    });
    const leave = await HRLeave.findOneAndUpdate(
      withHRAuditCapacity(filter),
      { $set: { status, reviewedBy: req.user.id, reviewedAt: new Date() }, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!leave) return respondNotFoundOrAuditBacklog(res, HRLeave, filter, "Leave request not found");
    await leave.populate("employee", "employeeCode name department");
    return respondWithAudit(res, HRLeave, leave._id, event, { leave });
  } catch {
    res.status(500).json({ message: "Could not review leave request" });
  }
});

router.get("/challans", async (req, res) => {
  try { res.json({ challans: await HRChallan.find({ companyId: req.companyId, deletedAt: null }).sort({ month: -1, createdAt: -1 }).limit(1000).lean() }); }
  catch { res.status(500).json({ message: "Could not load challan register" }); }
});

router.post("/challans", async (req, res) => {
  const month = clean(req.body?.month, 7);
  const type = ["PF", "ESIC", "Other"].includes(req.body?.type) ? req.body.type : "Other";
  const status = ["Draft", "Generated", "Paid", "Pending"].includes(req.body?.status) ? req.body.status : "Draft";
  const amount = Number(req.body?.amount);
  if (!/^\d{4}-\d{2}$/.test(month) || Number(month.slice(5, 7)) < 1 || Number(month.slice(5, 7)) > 12) return res.status(400).json({ message: "Valid wage month is required" });
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) return res.status(400).json({ message: "Valid challan amount is required" });
  try {
    const id = new mongoose.Types.ObjectId();
    const event = makeAudit(req, "hr.challan.created", "challan", id, {
      month, challanType: type, changedFields: ["month", "type", "amount", "status", "reference", "notes"]
    });
    const challan = await HRChallan.create({
      _id: id, companyId: req.companyId, month, type, status, amount,
      reference: clean(req.body?.reference, 100), notes: clean(req.body?.notes, 200),
      createdBy: req.user.id, auditOutbox: [event]
    });
    return respondWithAudit(res, HRChallan, challan._id, event, { challan }, 201);
  } catch {
    res.status(500).json({ message: "Could not save challan register entry" });
  }
});

router.delete("/challans/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid challan ID" });
  try {
    const filter = { _id: req.params.id, companyId: req.companyId, deletedAt: null };
    const event = makeAudit(req, "hr.challan.archived", "challan", req.params.id, { changedFields: ["deletedAt", "deletedBy"] });
    const challan = await HRChallan.findOneAndUpdate(
      withHRAuditCapacity(filter),
      { $set: { deletedAt: new Date(), deletedBy: req.user.id }, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!challan) return respondNotFoundOrAuditBacklog(res, HRChallan, filter, "Challan entry not found");
    return respondWithAudit(res, HRChallan, challan._id, event, { deleted: true, archived: true });
  } catch {
    res.status(500).json({ message: "Could not archive challan entry" });
  }
});

router.get("/payroll-attendance-summary", async (req, res) => {
  const month = clean(req.query?.month, 7);
  if (!/^[0-9]{4}-[0-9]{2}$/.test(month) || Number(month.slice(5, 7)) < 1 || Number(month.slice(5, 7)) > 12) {
    return res.status(400).json({ message: "Valid payroll month is required (YYYY-MM)" });
  }
  try {
    const start = month + "-01";
    const end = month + "-" + String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0");
    const [attendance, unpaidLeaves] = await Promise.all([
      HRAttendance.find({ companyId: req.companyId, deletedAt: null, date: { $gte: start, $lte: end } }).select("employee date status").lean(),
      HRLeave.find({ companyId: req.companyId, deletedAt: null, type: "Unpaid", status: "Approved", from: { $lte: end }, to: { $gte: start } }).select("employee from to").lean()
    ]);
    const stats = new Map();
    for (const row of attendance) {
      const id = String(row.employee);
      if (!stats.has(id)) stats.set(id, { employeeId: id, attendanceRecords: 0, presentDays: 0, halfDays: 0, absentDays: 0, workFromHomeDays: 0, holidayDays: 0, attendedEquivalentDays: 0, recordedDates: [], weekendAttendanceDays: 0, approvedUnpaidLeaveCalendarDays: 0, approvedUnpaidLeaveWeekdays: 0, approvedUnpaidLeaveWeekendDays: 0 });
      const s = stats.get(id);
      s.attendanceRecords += 1;
      s.recordedDates.push(row.date);
      const attendanceDay = new Date(row.date + "T00:00:00Z").getUTCDay();
      if (attendanceDay === 0 || attendanceDay === 6) s.weekendAttendanceDays += 1;
      if (row.status === "Present") { s.presentDays += 1; s.attendedEquivalentDays += 1; }
      else if (row.status === "Half day") { s.halfDays += 1; s.attendedEquivalentDays += 0.5; }
      else if (row.status === "Absent") s.absentDays += 1;
      else if (row.status === "Work from home") { s.workFromHomeDays += 1; s.attendedEquivalentDays += 1; }
      else if (row.status === "Holiday") { s.holidayDays += 1; s.attendedEquivalentDays += 1; }
    }
    const dayMs = 86400000;
    for (const leave of unpaidLeaves) {
      const from = leave.from > start ? leave.from : start;
      const to = leave.to < end ? leave.to : end;
      const days = Math.floor((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / dayMs) + 1;
      const id = String(leave.employee);
      if (!stats.has(id)) stats.set(id, { employeeId: id, attendanceRecords: 0, presentDays: 0, halfDays: 0, absentDays: 0, workFromHomeDays: 0, holidayDays: 0, attendedEquivalentDays: 0, recordedDates: [], weekendAttendanceDays: 0, approvedUnpaidLeaveCalendarDays: 0, approvedUnpaidLeaveWeekdays: 0, approvedUnpaidLeaveWeekendDays: 0 });
      const leaveStats = stats.get(id);
      leaveStats.approvedUnpaidLeaveCalendarDays += Math.max(0, days);
      for (let cursor = Date.parse(from + "T00:00:00Z"); cursor <= Date.parse(to + "T00:00:00Z"); cursor += dayMs) {
        const day = new Date(cursor).getUTCDay();
        if (day === 0 || day === 6) leaveStats.approvedUnpaidLeaveWeekendDays += 1;
        else leaveStats.approvedUnpaidLeaveWeekdays += 1;
      }
    }
    const calendarDates = [];
    for (let cursor = Date.parse(start + "T00:00:00Z"); cursor <= Date.parse(end + "T00:00:00Z"); cursor += dayMs) calendarDates.push(new Date(cursor).toISOString().slice(0, 10));
    const weekdayDates = calendarDates.filter(date => { const day = new Date(date + "T00:00:00Z").getUTCDay(); return day !== 0 && day !== 6; });
    const summaries = [...stats.values()].map(s => {
      const recorded = new Set(s.recordedDates);
      s.recordedWeekdays = s.recordedDates.filter(date => weekdayDates.includes(date)).length;
      s.missingWeekdayAttendanceDates = weekdayDates.filter(date => !recorded.has(date));
      s.missingWeekdayAttendanceCount = s.missingWeekdayAttendanceDates.length;
      s.attendanceOnApprovedUnpaidLeaveDates = s.recordedDates.filter(date => unpaidLeaves.some(leave => String(leave.employee) === s.employeeId && leave.from <= date && leave.to >= date));
      delete s.recordedDates;
      return s;
    });
    res.json({ month, calendarDays: Number(end.slice(8, 10)), weekdaysExcludingSaturdaySunday: weekdayDates.length, weekendDays: calendarDates.length - weekdayDates.length, attendanceCoverage: "Saturday/Sunday are informational only; your company work calendar may differ. Missing weekday dates require review. Approved unpaid leave uses calendar days and may overlap attendance.", summaries });
  } catch {
    res.status(500).json({ message: "Could not calculate attendance summary" });
  }
});

router.get("/payroll-runs", async (req, res) => {
  try {
    const runs = await HRPayrollRun.find({ companyId: req.companyId, deletedAt: null }).sort({ month: -1 }).limit(120).lean();
    res.json({ runs });
  } catch { res.status(500).json({ message: "Could not load monthly payroll history" }); }
});

router.post("/payroll-runs", async (req, res) => {
  const month = clean(req.body?.month, 7);
  const records = req.body?.records;
  if (!/^\d{4}-\d{2}$/.test(month) || Number(month.slice(5, 7)) < 1 || Number(month.slice(5, 7)) > 12) return res.status(400).json({ message: "Valid payroll month is required" });
  if (!Array.isArray(records) || records.length > 2000) return res.status(400).json({ message: "Payroll records must be a valid list of up to 2000 employees" });
  const fields = ["gross", "pfWage", "employeePF", "employerPF", "employeeESIC", "employerESIC", "otherEarnings", "otherDeductions"];
  const snapshot = [];
  for (const row of records) {
    const employeeCode = clean(row?.employeeCode, 30), name = clean(row?.name, 100);
    if (!employeeCode || !name) return res.status(400).json({ message: "Each payroll row needs employee code and name" });
    const record = { employeeId: validId(String(row?.employeeId || "")) ? row.employeeId : undefined, employeeCode, name, uan: clean(row?.uan, 12) };
    for (const field of fields) {
      const value = Number(row?.[field] ?? 0);
      if (!Number.isFinite(value) || value < 0 || value > 1000000000) return res.status(400).json({ message: "Invalid payroll amount: " + field });
      record[field] = value;
    }
    record.netPay = record.gross + record.otherEarnings - record.employeePF - record.employeeESIC - record.otherDeductions;
    snapshot.push(record);
  }
  if (snapshot.some(row => !validId(String(row.employeeId || "")))) return res.status(400).json({ message: "Every payroll row must reference an employee in the selected company" });
  const employeeIds = snapshot.map(row => String(row.employeeId));
  if (new Set(employeeIds).size !== employeeIds.length) return res.status(400).json({ message: "A payroll employee can appear only once per month" });
  try {
    const employees = await HREmployee.find({
      companyId: req.companyId, deletedAt: null, _id: { $in: employeeIds }
    }).select("_id employeeCode name uan").lean();
    if (employees.length !== snapshot.length) {
      return res.status(400).json({ message: "Payroll contains an employee outside the selected company or an unknown/archived employee" });
    }
    const employeeById = new Map(employees.map(employee => [String(employee._id), employee]));
    for (const row of snapshot) {
      const employee = employeeById.get(String(row.employeeId));
      row.employeeCode = employee.employeeCode;
      row.name = employee.name;
      row.uan = employee.uan || "";
    }
  } catch {
    return res.status(500).json({ message: "Could not verify payroll employee records" });
  }
  const sum = key => Math.round(snapshot.reduce((total, row) => total + row[key], 0) * 100) / 100;
  const totals = {
    gross: sum("gross"), otherEarnings: sum("otherEarnings"), otherDeductions: sum("otherDeductions"),
    employeePF: sum("employeePF"), employerPF: sum("employerPF"),
    employeeESIC: sum("employeeESIC"), employerESIC: sum("employerESIC"), netPay: sum("netPay")
  };
  try {
    const existing = await HRPayrollRun.findOne({ companyId: req.companyId, month });
    if (existing && existing.status !== "Draft") return res.status(409).json({ message: "This payroll month is " + existing.status + " and is locked. Only Draft payroll can be replaced." });
    const id = existing?._id || new mongoose.Types.ObjectId();
    const action = !existing ? "hr.payroll.draft.created" : existing.deletedAt ? "hr.payroll.draft.restored" : "hr.payroll.draft.replaced";
    const event = makeAudit(req, action, "payroll_run", id, {
      month, employeeCount: snapshot.length,
      changedFields: ["status", "employeeCount", "totals", "records", "createdBy"]
    });
    let run;
    if (existing) {
      run = await HRPayrollRun.findOneAndUpdate(
        withHRAuditCapacity({ _id: existing._id, companyId: req.companyId, status: "Draft" }),
        { $set: {
          companyId: req.companyId, month, status: "Draft", employeeCount: snapshot.length,
          totals, records: snapshot, createdBy: req.user.id,
          approvedBy: null, approvedAt: null, paidBy: null, paidAt: null,
          deletedAt: null, deletedBy: null
        }, $push: { auditOutbox: event } },
        { new: true, runValidators: true }
      );
      if (!run) return res.status(503).json({ message: "Payroll changed concurrently or its audit outbox is at capacity. No replacement was applied; refresh and retry after audit recovery." });
    } else {
      run = await HRPayrollRun.create({
        _id: id, companyId: req.companyId, month, status: "Draft",
        employeeCount: snapshot.length, totals, records: snapshot, createdBy: req.user.id,
        auditOutbox: [event]
      });
    }
    return respondWithAudit(res, HRPayrollRun, run._id, event, { run, replacedExistingMonth: Boolean(existing) }, existing ? 200 : 201);
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Payroll month is already being saved. Refresh and try again." });
    res.status(500).json({ message: "Could not save monthly payroll snapshot" });
  }
});

router.post("/payroll-runs/register", async (req, res) => {
  const month = clean(req.body?.month, 7);
  const inputRows = req.body?.employees;
  if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ message: "Valid payroll month is required (YYYY-MM)" });
  }
  if (!Array.isArray(inputRows) || inputRows.length < 1 || inputRows.length > 2000) {
    return res.status(400).json({ message: "Select between 1 and 2000 employee attendance snapshots" });
  }
  const employeeIds = inputRows.map(row => String(row?.employeeId || ""));
  if (employeeIds.some(id => !validId(id)) || new Set(employeeIds).size !== employeeIds.length) {
    return res.status(400).json({ message: "Each employee must have one valid, unique employee ID" });
  }
  try {
    const employees = await HREmployee.find({
      companyId: req.companyId, deletedAt: null, _id: { $in: employeeIds }
    }).select("_id employeeCode name uan status basicSalary hra da otherAllowances").lean();
    if (employees.length !== employeeIds.length) {
      return res.status(400).json({ message: "Payroll contains an employee outside this company or an unknown/archived employee" });
    }
    const attendanceById = new Map(inputRows.map(row => [String(row.employeeId), row.attendance]));
    const register = buildMonthlyPayrollRegister({
      month,
      employees: employees.map(employee => ({
        ...employee,
        attendance: attendanceById.get(String(employee._id))
      }))
    });
    if (!register.records.length) {
      return res.status(400).json({ message: "No eligible employees remain after excluding inactive employees" });
    }
    const employeeByCode = new Map(employees.map(employee => [employee.employeeCode.toUpperCase(), employee]));
    const records = register.records.map(row => {
      const employee = employeeByCode.get(row.employeeCode.toUpperCase());
      return {
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        uan: employee.uan || "",
        gross: row.salary.gross,
        otherEarnings: row.salary.otherEarnings,
        otherDeductions: row.salary.otherDeductions,
        pfWage: 0,
        employeePF: 0,
        employerPF: 0,
        employeeESIC: 0,
        employerESIC: 0,
        netPay: row.salary.netPay,
        attendanceSnapshot: row.attendance,
        salaryComponents: row.salary
      };
    });
    const total = key => Math.round(records.reduce((sum, row) => sum + row[key], 0) * 100) / 100;
    const totals = {
      gross: register.totals.gross,
      otherEarnings: register.totals.otherEarnings,
      otherDeductions: register.totals.otherDeductions,
      employeePF: 0, employerPF: 0, employeeESIC: 0, employerESIC: 0,
      netPay: total("netPay")
    };
    const existing = await HRPayrollRun.findOne({ companyId: req.companyId, month });
    if (existing && existing.status !== "Draft") {
      return res.status(409).json({ message: "This payroll month is " + existing.status + " and is locked. Only Draft payroll can be replaced." });
    }
    const id = existing?._id || new mongoose.Types.ObjectId();
    const action = !existing ? "hr.payroll.register.created" : existing.deletedAt ? "hr.payroll.register.restored" : "hr.payroll.register.replaced";
    const event = makeAudit(req, action, "payroll_run", id, {
      month, employeeCount: records.length, excludedEmployeeCount: register.excludedEmployees.length,
      changedFields: ["status", "employeeCount", "totals", "records", "createdBy"]
    });
    let run;
    if (existing) {
      run = await HRPayrollRun.findOneAndUpdate(
        withHRAuditCapacity({ _id: existing._id, companyId: req.companyId, status: "Draft" }),
        { $set: {
          companyId: req.companyId, month, status: "Draft", employeeCount: records.length,
          totals, records, createdBy: req.user.id, approvedBy: null, approvedAt: null,
          paidBy: null, paidAt: null, deletedAt: null, deletedBy: null
        }, $push: { auditOutbox: event } },
        { new: true, runValidators: true }
      );
      if (!run) return res.status(409).json({ message: "Payroll changed concurrently or audit capacity is full. Refresh before retrying." });
    } else {
      run = await HRPayrollRun.create({
        _id: id, companyId: req.companyId, month, status: "Draft",
        employeeCount: records.length, totals, records, createdBy: req.user.id, auditOutbox: [event]
      });
    }
    return respondWithAudit(res, HRPayrollRun, run._id, event, {
      run, register: { excludedEmployees: register.excludedEmployees }
    }, existing ? 200 : 201);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Payroll month is already being saved. Refresh and retry." });
    if (error instanceof TypeError || error instanceof RangeError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Could not build and save monthly payroll register" });
  }
});

router.patch("/payroll-runs/:id/status", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid payroll run ID" });
  const status = req.body?.status;
  if (!["Draft", "Approved", "Paid"].includes(status)) return res.status(400).json({ message: "Status must be Draft, Approved or Paid" });
  try {
    const current = await HRPayrollRun.findOne({ _id: req.params.id, companyId: req.companyId, deletedAt: null });
    if (!current) return res.status(404).json({ message: "Payroll run not found" });
    const decision = validatePayrollTransition({
      currentStatus: current.status, nextStatus: status,
      createdBy: current.createdBy, approvedBy: current.approvedBy, userId: req.user.id
    });
    if (!decision.allowed) return res.status(decision.statusCode).json({ message: decision.message });
    if (decision.noChange) return res.json({ run: current });
    const now = new Date();
    const updates = { status };
    if (status === "Approved") { updates.approvedBy = req.user.id; updates.approvedAt = now; }
    if (status === "Paid") { updates.paidBy = req.user.id; updates.paidAt = now; }
    const event = makeAudit(req, status === "Approved" ? "hr.payroll.approved" : "hr.payroll.released", "payroll_run", current._id, {
      fromStatus: current.status, toStatus: status,
      changedFields: status === "Approved" ? ["status", "approvedBy", "approvedAt"] : ["status", "paidBy", "paidAt"]
    });
    const run = await HRPayrollRun.findOneAndUpdate(
      withHRAuditCapacity({ _id: current._id, companyId: req.companyId, status: current.status, deletedAt: null }),
      { $set: updates, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!run) {
      const latest = await HRPayrollRun.findOne({
        _id: current._id, companyId: req.companyId, deletedAt: null
      }).select("status auditOutbox").lean();
      if (!latest) return res.status(404).json({ message: "Payroll run not found" });
      if (latest.status !== current.status) {
        return res.status(409).json({ message: "Payroll changed concurrently. Reload before retrying the transition." });
      }
      if ((latest.auditOutbox?.length || 0) >= MAX_PENDING_HR_AUDIT_EVENTS) {
        return res.status(503).json({ message: "The HR audit outbox is at capacity. No payroll status change was applied; retry after audit recovery." });
      }
      return res.status(409).json({ message: "Payroll transition could not be applied. Reload and retry." });
    }
    return respondWithAudit(res, HRPayrollRun, run._id, event, { run });
  } catch {
    res.status(500).json({ message: "Could not update payroll status" });
  }
});

router.delete("/payroll-runs/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid payroll run ID" });
  try {
    const current = await HRPayrollRun.findOne({ _id: req.params.id, companyId: req.companyId, deletedAt: null });
    if (!current) return res.status(404).json({ message: "Payroll run not found" });
    if (current.status !== "Draft") return res.status(409).json({ message: "Only Draft payroll can be archived. Approved and Paid runs are retained as financial evidence." });
    const event = makeAudit(req, "hr.payroll.draft.archived", "payroll_run", current._id, {
      month: current.month, changedFields: ["deletedAt", "deletedBy"]
    });
    const run = await HRPayrollRun.findOneAndUpdate(
      withHRAuditCapacity({ _id: current._id, companyId: req.companyId, status: "Draft", deletedAt: null }),
      { $set: { deletedAt: new Date(), deletedBy: req.user.id }, $push: { auditOutbox: event } },
      { new: true, runValidators: true }
    );
    if (!run) return res.status(503).json({ message: "Payroll changed concurrently or its audit outbox is at capacity. No archive was applied." });
    return respondWithAudit(res, HRPayrollRun, run._id, event, { deleted: true, archived: true });
  } catch {
    res.status(500).json({ message: "Could not archive payroll run" });
  }
});

export default router;
