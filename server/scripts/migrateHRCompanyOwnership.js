import "dotenv/config";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import Company from "../models/Company.js";
import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";

// Migration scripts must never create collections or indexes implicitly.
// DDL is performed only by the explicit --apply path below.
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

const APPLY = process.argv.includes("--apply");
const mappingArg = process.argv.find(value => value.startsWith("--mapping="));
if (!mappingArg) throw new Error("Provide an explicit mapping file: --mapping=/absolute/path/owner-company-map.json");
const mappingPath = mappingArg.slice("--mapping=".length);
const ownerMap = JSON.parse(readFileSync(mappingPath, "utf8"));
const validId = value => mongoose.isValidObjectId(String(value || ""));

function mappedCompanyForOwner(ownerId) {
  const companyId = ownerMap[String(ownerId || "")];
  if (!validId(companyId)) throw new Error("No valid company mapping for legacy HR creator " + String(ownerId || "(missing)"));
  return new mongoose.Types.ObjectId(String(companyId));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  const migrationDatabase = decodeURIComponent(new URL(process.env.MONGODB_URI).pathname.replace(/^\\//, ""));
  if (!migrationDatabase) throw new Error("MONGODB_URI must include an explicit database name");
  if (!/_test$/i.test(migrationDatabase) && process.env.HR_MIGRATION_ALLOW_NON_TEST_DATABASE !== "1") {
    throw new Error("Refusing non-test database. Set HR_MIGRATION_ALLOW_NON_TEST_DATABASE=1 only after an independently approved migration plan.");
  }
  if (APPLY && process.env.HR_MIGRATION_ALLOW_APPLY !== "1") {
    throw new Error("Refusing --apply without HR_MIGRATION_ALLOW_APPLY=1 and explicit operational approval.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const companies = new Map((await Company.find({ status: "active" }).select("_id").lean()).map(item => [String(item._id), item]));
  for (const [ownerId, companyId] of Object.entries(ownerMap)) {
    if (!validId(ownerId) || !validId(companyId) || !companies.has(String(companyId))) {
      throw new Error("Mapping contains an invalid owner ID or a company that is not active: " + ownerId);
    }
  }

  const employees = await HREmployee.find().select("_id companyId createdBy").lean();
  const employeeCompany = new Map();
  const employeeUpdates = [];
  for (const employee of employees) {
    const companyId = employee.companyId || mappedCompanyForOwner(employee.createdBy);
    if (!companies.has(String(companyId))) throw new Error("Employee " + employee._id + " maps to an inactive or unknown company");
    employeeCompany.set(String(employee._id), String(companyId));
    if (!employee.companyId) employeeUpdates.push({ updateOne: { filter: { _id: employee._id, companyId: null }, update: { $set: { companyId } } } });
  }

  async function childUpdates(model, label) {
    const rows = await model.find().select("_id companyId employee").lean();
    const updates = [];
    for (const row of rows) {
      const parentCompany = employeeCompany.get(String(row.employee));
      if (!parentCompany) throw new Error(label + " record " + row._id + " points to an unknown employee");
      if (row.companyId && String(row.companyId) !== parentCompany) {
        throw new Error(label + " record " + row._id + " has a company mismatch with its employee");
      }
      if (!row.companyId) updates.push({ updateOne: { filter: { _id: row._id, companyId: null }, update: { $set: { companyId: new mongoose.Types.ObjectId(parentCompany) } } } });
    }
    return updates;
  }

  async function creatorUpdates(model, label, includePayrollReferences = false) {
    const rows = await model.find().lean();
    const updates = [];
    for (const row of rows) {
      const companyId = row.companyId || mappedCompanyForOwner(row.createdBy);
      if (!companies.has(String(companyId))) throw new Error(label + " record " + row._id + " maps to an inactive or unknown company");
      if (includePayrollReferences) {
        for (const record of row.records || []) {
          if (record.employeeId) {
            const employeeCompanyId = employeeCompany.get(String(record.employeeId));
            if (!employeeCompanyId || employeeCompanyId !== String(companyId)) {
              throw new Error("Payroll run " + row._id + " contains an employee reference outside its mapped company");
            }
          }
        }
      }
      if (!row.companyId) updates.push({ updateOne: { filter: { _id: row._id, companyId: null }, update: { $set: { companyId } } } });
    }
    return updates;
  }

  const [attendanceUpdates, leaveUpdates, challanUpdates, payrollUpdates] = await Promise.all([
    childUpdates(HRAttendance, "Attendance"),
    childUpdates(HRLeave, "Leave"),
    creatorUpdates(HRChallan, "Challan"),
    creatorUpdates(HRPayrollRun, "Payroll", true)
  ]);
  const plan = {
    mode: APPLY ? "apply" : "dry-run",
    employees: employeeUpdates.length,
    attendance: attendanceUpdates.length,
    leaves: leaveUpdates.length,
    challans: challanUpdates.length,
    payrollRuns: payrollUpdates.length,
    note: "Ownership is derived only from the explicit creator-to-company map or verified employee parent. No default/first company is selected."
  };
  console.log(JSON.stringify(plan, null, 2));
  if (!APPLY) return;

  const operations = [
    [HREmployee, employeeUpdates],
    [HRAttendance, attendanceUpdates],
    [HRLeave, leaveUpdates],
    [HRChallan, challanUpdates],
    [HRPayrollRun, payrollUpdates]
  ];
  for (const [model, writes] of operations) {
    if (writes.length) await model.bulkWrite(writes, { ordered: true });
  }

  const remaining = {};
  for (const [label, model] of [["employees", HREmployee], ["attendance", HRAttendance], ["leaves", HRLeave], ["challans", HRChallan], ["payrollRuns", HRPayrollRun]]) {
    remaining[label] = await model.countDocuments({ $or: [{ companyId: { $exists: false } }, { companyId: null }] });
  }
  console.log("Post-migration unassigned record counts:", JSON.stringify(remaining));
  if (Object.values(remaining).some(count => count > 0)) {
    throw new Error("Some HR records remain unassigned. Re-run after reviewing the errors; the migration is idempotent.");
  }
}

main().catch(error => {
  console.error("HR company ownership migration stopped:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
