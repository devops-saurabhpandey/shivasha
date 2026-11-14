import "dotenv/config";
import mongoose from "mongoose";
import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";

// Migration scripts must never create collections or indexes implicitly.
// DDL is performed only by the explicit --apply path below.
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

const APPLY = process.argv.includes("--apply");
const COLLECTIONS = [
  { name: HREmployee.collection.name, legacyUnique: "employeeCode_1", scopedKeys: { companyId: 1, employeeCode: 1 } },
  { name: HRAttendance.collection.name, legacyUnique: "employee_1_date_1", scopedKeys: { companyId: 1, employee: 1, date: 1 } },
  { name: HRPayrollRun.collection.name, legacyUnique: "month_1", scopedKeys: { companyId: 1, month: 1 } }
];
const HR_COLLECTION_NAMES = [HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun].map(model => model.collection.name);

function sameKeys(left, right) {
  return JSON.stringify(Object.entries(left)) === JSON.stringify(Object.entries(right));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  const migrationDatabase = decodeURIComponent(new URL(process.env.MONGODB_URI).pathname.replace(/^\\//, ""));
  if (!migrationDatabase) throw new Error("MONGODB_URI must include an explicit database name");
  if (!/_test$/i.test(migrationDatabase) && process.env.HR_MIGRATION_ALLOW_NON_TEST_DATABASE !== "1") {
    throw new Error("Refusing non-test database. Set HR_MIGRATION_ALLOW_NON_TEST_DATABASE=1 only after an independently approved migration plan.");
  }
  if (APPLY && !process.env.HR_MIGRATION_ALLOW_APPLY) {
    throw new Error("Refusing --apply without HR_MIGRATION_ALLOW_APPLY=1 and explicit operational approval.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const missing = {};
  for (const name of HR_COLLECTION_NAMES) {
    const collection = db.collection(name);
    missing[name] = await collection.countDocuments({
      $or: [{ companyId: { $exists: false } }, { companyId: null }]
    });
  }
  const hasUnassigned = Object.values(missing).some(count => count > 0);
  console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", unassignedLegacyRecords: missing }, null, 2));
  if (hasUnassigned) {
    throw new Error("Refusing index migration: assign every legacy HR record to a verified company first. This script never guesses tenant ownership.");
  }

  for (const item of COLLECTIONS) {
    const collection = db.collection(item.name);
    const duplicates = await collection.aggregate([
      { $group: { _id: { companyId: "$companyId", value: item.name === HREmployee.collection.name ? "$employeeCode" : item.name === HRPayrollRun.collection.name ? "$month" : { employee: "$employee", date: "$date" } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 }
    ]).toArray();
    if (duplicates.length) {
      throw new Error("Duplicate company-scoped key in " + item.name + ": " + JSON.stringify(duplicates));
    }
    const indexes = await collection.indexes();
    const oldIndex = indexes.find(index => index.name === item.legacyUnique);
    const scopedIndex = indexes.find(index => sameKeys(index.key, item.scopedKeys));
    if (!APPLY) {
      console.log(JSON.stringify({
        collection: item.name,
        legacyUniqueIndex: oldIndex?.name || null,
        existingScopedIndex: scopedIndex ? { name: scopedIndex.name, unique: Boolean(scopedIndex.unique) } : null,
        plannedAction: "drop old global unique index if present; create unique company-scoped index"
      }));
      continue;
    }
    if (oldIndex) await collection.dropIndex(oldIndex.name);
    if (scopedIndex && !scopedIndex.unique) await collection.dropIndex(scopedIndex.name);
    await collection.createIndex(item.scopedKeys, { unique: true, partialFilterExpression: { companyId: { $type: "objectId" } }, name: item.name === HREmployee.collection.name ? "company_employee_code_unique" : item.name === HRPayrollRun.collection.name ? "company_payroll_month_unique" : "company_employee_attendance_date_unique" });
    console.log("Created company-scoped unique index for " + item.name);
  }

  // The HR audit worker scans these multikey indexes to find durable outbox
  // entries without repeatedly scanning every HR document.
  for (const model of [HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun]) {
    const collection = db.collection(model.collection.name);
    const keys = { "auditOutbox.eventId": 1 };
    const indexes = await collection.indexes();
    const existing = indexes.find(index => sameKeys(index.key, keys));
    if (!APPLY) {
      console.log(JSON.stringify({
        collection: model.collection.name,
        existingAuditOutboxIndex: existing?.name || null,
        plannedAction: existing ? "keep existing audit outbox scan index" : "create audit outbox scan index"
      }));
      continue;
    }
    if (!existing) {
      await collection.createIndex(keys, { name: "hr_audit_outbox_pending" });
      console.log("Created HR audit outbox scan index for " + model.collection.name);
    }
  }

}

main().catch(error => {
  console.error("HR index migration stopped:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
