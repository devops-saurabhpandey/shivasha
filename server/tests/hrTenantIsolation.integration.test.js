import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import EnterpriseAuditEvent from "../models/EnterpriseAuditEvent.js";
import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";
import hrRoutes from "../routes/hr.js";
import { drainHRAuditOutbox } from "../enterprise/hrAuditOutbox.js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mongoUri = process.env.MONGODB_TEST_URI;

test("real MongoDB HR routes enforce tenant isolation, maker-checker and durable audit outbox", {
  skip: !mongoUri && "Set MONGODB_TEST_URI to an isolated MongoDB *_test database"
}, async () => {
  const databaseName = decodeURIComponent(new URL(mongoUri).pathname.replace(/^\//, ""));
  if (!databaseName || !/_test$/i.test(databaseName)) {
    throw new Error("Refusing to run HR integration tests unless MONGODB_TEST_URI names a database ending in _test");
  }
  if (process.env.MONGODB_URI && process.env.MONGODB_URI === mongoUri) {
    throw new Error("MONGODB_TEST_URI must not point at the configured application database");
  }

  process.env.JWT_SECRET = "shivasha-hr-integration-test-only-secret";
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, writeConcern: { w: 1, j: true, wtimeout: 10000 } });
  const serverApp = express();
  serverApp.use(express.json());
  serverApp.use("/api/hr", hrRoutes);
  const server = serverApp.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = "http://127.0.0.1:" + server.address().port + "/api/hr";

  try {
    await mongoose.connection.dropDatabase();
    await Promise.all([
      User.syncIndexes(), Company.syncIndexes(), CompanyMembership.syncIndexes(), EnterpriseAuditEvent.syncIndexes(),
      HREmployee.syncIndexes(), HRAttendance.syncIndexes(), HRLeave.syncIndexes(), HRChallan.syncIndexes(), HRPayrollRun.syncIndexes()
    ]);

    const [hrUser, approverUser, financeUser, otherCompanyUser] = await Promise.all([
      User.create({ name: "HR Preparer", email: "hr-preparer@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Independent Approver", email: "approver@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Finance Releaser", email: "finance@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Other Tenant HR", email: "other-tenant@example.test", passwordHash: "test-hash" })
    ]);

    const companyA = await Company.create({
      name: "Tenant A", legalName: "Tenant A Private Limited", entityType: "private_limited",
      countryCode: "IN", functionalCurrency: "INR", reportingCurrency: "INR",
      fiscalYearStartMonth: 4, timeZone: "Asia/Kolkata", taxJurisdictions: ["IN-UP"],
      createdBy: hrUser._id
    });
    const companyB = await Company.create({
      name: "Tenant B", legalName: "Tenant B Public Limited", entityType: "public_limited",
      countryCode: "IN", functionalCurrency: "INR", reportingCurrency: "INR",
      fiscalYearStartMonth: 4, timeZone: "Asia/Kolkata", taxJurisdictions: ["IN-DL"],
      createdBy: otherCompanyUser._id
    });
    await CompanyMembership.create([
      { companyId: companyA._id, userId: hrUser._id, role: "hr_manager", status: "active", invitedBy: hrUser._id },
      { companyId: companyA._id, userId: approverUser._id, role: "company_admin", status: "active", invitedBy: hrUser._id },
      { companyId: companyA._id, userId: financeUser._id, role: "finance_manager", status: "active", invitedBy: hrUser._id },
      { companyId: companyB._id, userId: otherCompanyUser._id, role: "hr_manager", status: "active", invitedBy: otherCompanyUser._id }
    ]);

    const employeeA = await HREmployee.create({
      companyId: companyA._id, employeeCode: "A-SEED", name: "Tenant A Employee", createdBy: hrUser._id
    });
    const employeeB = await HREmployee.create({
      companyId: companyB._id, employeeCode: "B-SEED", name: "Tenant B Employee", createdBy: otherCompanyUser._id
    });
    const attendanceA = await HRAttendance.create({
      companyId: companyA._id, employee: employeeA._id, date: "2026-10-01",
      status: "Present", recordedBy: hrUser._id
    });
    const attendanceB = await HRAttendance.create({
      companyId: companyB._id, employee: employeeB._id, date: "2026-10-01",
      status: "Present", recordedBy: otherCompanyUser._id
    });
    const leaveA = await HRLeave.create({
      companyId: companyA._id, employee: employeeA._id, type: "Casual",
      from: "2026-10-10", to: "2026-10-10", requestedBy: hrUser._id
    });
    const leaveB = await HRLeave.create({
      companyId: companyB._id, employee: employeeB._id, type: "Casual",
      from: "2026-10-10", to: "2026-10-10", requestedBy: otherCompanyUser._id
    });
    const challanA = await HRChallan.create({
      companyId: companyA._id, month: "2026-10", type: "PF", amount: 100,
      createdBy: hrUser._id
    });
    const challanB = await HRChallan.create({
      companyId: companyB._id, month: "2026-10", type: "PF", amount: 200,
      createdBy: otherCompanyUser._id
    });
    const payrollA = await HRPayrollRun.create({
      companyId: companyA._id, month: "2026-10", status: "Draft", employeeCount: 1,
      createdBy: hrUser._id,
      records: [{ employeeId: employeeA._id, employeeCode: employeeA.employeeCode, name: employeeA.name,
        gross: 100, pfWage: 100, employeePF: 0, employerPF: 0, employeeESIC: 0, employerESIC: 0, netPay: 100 }]
    });
    const payrollB = await HRPayrollRun.create({
      companyId: companyB._id, month: "2026-10", status: "Draft", employeeCount: 1,
      createdBy: otherCompanyUser._id,
      records: [{ employeeId: employeeB._id, employeeCode: employeeB.employeeCode, name: employeeB.name,
        gross: 200, pfWage: 200, employeePF: 0, employerPF: 0, employeeESIC: 0, employerESIC: 0, netPay: 200 }]
    });

    const tokens = new Map();
    const call = async (user, companyId, path, method = "GET", body) => {
      if (!tokens.has(String(user._id))) {
        tokens.set(String(user._id), jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "10m" }));
      }
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          authorization: "Bearer " + tokens.get(String(user._id)),
          "x-company-id": String(companyId),
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      return { status: response.status, body: await response.json() };
    };
    const companyAId = String(companyA._id);
    const companyBId = String(companyB._id);
    const assertRecorded = result => {
      assert.equal(result.body.audit?.status, "recorded", JSON.stringify(result.body));
      assert.ok(result.body.audit.eventId);
    };
    const payrollRow = employeeId => ({
      employeeId: String(employeeId), employeeCode: "UNTRUSTED-CODE", name: "Untrusted Name",
      gross: 30000, pfWage: 15000, employeePF: 1800, employerPF: 1800,
      employeeESIC: 0, employerESIC: 0, otherEarnings: 0, otherDeductions: 0
    });

    // Real MongoDB reads are tenant-scoped for all five HR resources.
    for (const [path, key, ownId, foreignId] of [
      ["/employees", "employees", employeeA._id, employeeB._id],
      ["/attendance", "attendance", attendanceA._id, attendanceB._id],
      ["/leaves", "leaves", leaveA._id, leaveB._id],
      ["/challans", "challans", challanA._id, challanB._id],
      ["/payroll-runs", "runs", payrollA._id, payrollB._id]
    ]) {
      const result = await call(hrUser, companyAId, path);
      assert.equal(result.status, 200, path);
      const ids = result.body[key].map(row => String(row._id));
      assert.ok(ids.includes(String(ownId)), path + " must return the selected tenant's record");
      assert.ok(!ids.includes(String(foreignId)), path + " must never return another tenant's record");
    }

    // Tenant A cannot update or archive Tenant B's records, even with valid IDs.
    assert.equal((await call(hrUser, companyAId, "/employees/" + employeeB._id, "PATCH", { name: "Tampered" })).status, 404);
    assert.equal((await call(hrUser, companyAId, "/employees/" + employeeB._id, "DELETE")).status, 404);
    assert.equal((await call(hrUser, companyAId, "/attendance/" + attendanceB._id, "DELETE")).status, 404);
    assert.equal((await call(hrUser, companyAId, "/leaves/" + leaveB._id + "/review", "PATCH", { status: "Approved" })).status, 404);
    assert.equal((await call(hrUser, companyAId, "/challans/" + challanB._id, "DELETE")).status, 404);
    assert.equal((await call(hrUser, companyAId, "/payroll-runs/" + payrollB._id + "/status", "PATCH", { status: "Approved" })).status, 404);
    assert.equal((await call(hrUser, companyAId, "/payroll-runs/" + payrollB._id, "DELETE")).status, 404);
    assert.equal((await call(hrUser, companyAId, "/attendance", "POST", {
      employeeId: String(employeeB._id), date: "2026-11-01", status: "Present"
    })).status, 404);
    assert.equal((await call(hrUser, companyAId, "/leaves", "POST", {
      employeeId: String(employeeB._id), from: "2026-11-01", to: "2026-11-01", type: "Casual"
    })).status, 404);
    assert.equal((await call(hrUser, companyAId, "/payroll-runs", "POST", {
      month: "2026-11", records: [payrollRow(employeeB._id)]
    })).status, 400);

    const [stillForeignEmployee, stillForeignAttendance, stillForeignLeave, stillForeignChallan, stillForeignPayroll] = await Promise.all([
      HREmployee.findById(employeeB._id).lean(), HRAttendance.findById(attendanceB._id).lean(),
      HRLeave.findById(leaveB._id).lean(), HRChallan.findById(challanB._id).lean(),
      HRPayrollRun.findById(payrollB._id).lean()
    ]);
    assert.equal(stillForeignEmployee.name, "Tenant B Employee");
    assert.equal(stillForeignEmployee.deletedAt, null);
    assert.equal(stillForeignAttendance.deletedAt, null);
    assert.equal(stillForeignLeave.status, "Pending");
    assert.equal(stillForeignChallan.deletedAt, null);
    assert.equal(stillForeignPayroll.status, "Draft");
    assert.equal(stillForeignPayroll.deletedAt, null);

    // Every supported HR mutation carries its audit intent in the same MongoDB document.
    const createdEmployee = await call(hrUser, companyAId, "/employees", "POST", {
      employeeCode: "A-AUDIT-1", name: "Audit Employee", monthlyGrossSalary: 30000, basicSalary: 15000
    });
    assert.equal(createdEmployee.status, 201);
    assertRecorded(createdEmployee);
    const newEmployeeId = createdEmployee.body.employee._id;

    const updatedEmployee = await call(hrUser, companyAId, "/employees/" + newEmployeeId, "PATCH", { department: "Finance" });
    assert.equal(updatedEmployee.status, 200);
    assertRecorded(updatedEmployee);

    const attendance = await call(hrUser, companyAId, "/attendance", "POST", {
      employeeId: newEmployeeId, date: "2026-11-14", status: "Present", note: "Test entry"
    });
    assert.equal(attendance.status, 201);
    assertRecorded(attendance);
    const attendanceId = attendance.body.attendance._id;
    const archivedAttendance = await call(hrUser, companyAId, "/attendance/" + attendanceId, "DELETE");
    assert.equal(archivedAttendance.status, 200);
    assertRecorded(archivedAttendance);

    const leave = await call(hrUser, companyAId, "/leaves", "POST", {
      employeeId: newEmployeeId, from: "2026-11-20", to: "2026-11-21", type: "Sick", reason: "Test"
    });
    assert.equal(leave.status, 201);
    assertRecorded(leave);
    const reviewedLeave = await call(hrUser, companyAId, "/leaves/" + leave.body.leave._id + "/review", "PATCH", { status: "Approved" });
    assert.equal(reviewedLeave.status, 200);
    assertRecorded(reviewedLeave);

    const challan = await call(hrUser, companyAId, "/challans", "POST", {
      month: "2026-11", type: "PF", amount: 1200, reference: "TEST-CHALLAN"
    });
    assert.equal(challan.status, 201);
    assertRecorded(challan);
    const archivedChallan = await call(hrUser, companyAId, "/challans/" + challan.body.challan._id, "DELETE");
    assert.equal(archivedChallan.status, 200);
    assertRecorded(archivedChallan);

    const payroll = await call(hrUser, companyAId, "/payroll-runs", "POST", {
      month: "2026-11", records: [payrollRow(newEmployeeId)]
    });
    assert.equal(payroll.status, 201);
    assertRecorded(payroll);
    const payrollId = payroll.body.run._id;
    assert.equal(payroll.body.run.records[0].employeeCode, "A-AUDIT-1", "payroll identity must be canonicalized from the employee master");

    const registerDraft = await call(hrUser, companyAId, "/payroll-runs/register", "POST", {
      month: "2026-09",
      employees: [{
        employeeId: newEmployeeId,
        attendance: {
          totalDays: 30, presentDays: 28, paidLeaveDays: 1, weeklyOffDays: 0,
          paidHolidayDays: 0, unpaidLeaveDays: 1, variableEarnings: 500, otherDeductions: 250
        }
      }]
    });
    assert.equal(registerDraft.status, 201, JSON.stringify(registerDraft.body));
    assertRecorded(registerDraft);
    assert.equal(registerDraft.body.run.records[0].employeeCode, "A-AUDIT-1");
    assert.deepEqual(registerDraft.body.run.records[0].attendanceSnapshot, {
      totalDays: 30, paidDays: 29, unpaidLeaveDays: 1
    });
    assert.equal(registerDraft.body.run.records[0].salaryComponents.basic, 14500);
    assert.equal(registerDraft.body.run.records[0].salaryComponents.otherEarnings, 500);
    assert.equal(registerDraft.body.run.records[0].salaryComponents.otherDeductions, 250);
    assert.equal(registerDraft.body.run.records[0].netPay, 14750);
    assert.equal(registerDraft.body.totals.employeePF, 0, "statutory contributions stay explicitly unconfigured");
    assert.equal((await call(hrUser, companyAId, "/payroll-runs/register", "POST", {
      month: "2026-08",
      employees: [{ employeeId: String(employeeB._id), attendance: {
        totalDays: 30, presentDays: 30, paidLeaveDays: 0, weeklyOffDays: 0,
        paidHolidayDays: 0, unpaidLeaveDays: 0
      }}]
    })).status, 400, "monthly register must reject a foreign-company employee");

    // Maker-checker: maker cannot approve; independent admin can approve;
    // the approver cannot release; finance can release; HR cannot release.
    assert.equal((await call(hrUser, companyAId, "/payroll-runs/" + payrollId + "/status", "PATCH", { status: "Approved" })).status, 403);
    const approved = await call(approverUser, companyAId, "/payroll-runs/" + payrollId + "/status", "PATCH", { status: "Approved" });
    assert.equal(approved.status, 200);
    assertRecorded(approved);
    assert.equal((await call(approverUser, companyAId, "/payroll-runs/" + payrollId + "/status", "PATCH", { status: "Paid" })).status, 403);
    assert.equal((await call(hrUser, companyAId, "/payroll-runs/" + payrollId + "/status", "PATCH", { status: "Paid" })).status, 403);
    const released = await call(financeUser, companyAId, "/payroll-runs/" + payrollId + "/status", "PATCH", { status: "Paid" });
    assert.equal(released.status, 200);
    assertRecorded(released);
    assert.equal((await call(financeUser, companyAId, "/payroll-runs", "POST", {
      month: "2026-12", records: [payrollRow(newEmployeeId)]
    })).status, 403, "finance manager cannot prepare payroll");

    const draftToArchive = await call(hrUser, companyAId, "/payroll-runs", "POST", {
      month: "2026-12", records: [payrollRow(newEmployeeId)]
    });
    assert.equal(draftToArchive.status, 201);
    assertRecorded(draftToArchive);
    const archivedDraft = await call(hrUser, companyAId, "/payroll-runs/" + draftToArchive.body.run._id, "DELETE");
    assert.equal(archivedDraft.status, 200);
    assertRecorded(archivedDraft);

    const archivedEmployee = await call(hrUser, companyAId, "/employees/" + newEmployeeId, "DELETE");
    assert.equal(archivedEmployee.status, 200);
    assert.equal(archivedEmployee.body.archived, true);
    assertRecorded(archivedEmployee);

    const actions = await EnterpriseAuditEvent.find({ companyId: companyA._id }).distinct("action");
    for (const action of [
      "hr.employee.created", "hr.employee.updated", "hr.employee.archived",
      "hr.attendance.saved", "hr.attendance.archived",
      "hr.leave.created", "hr.leave.reviewed",
      "hr.challan.created", "hr.challan.archived",
      "hr.payroll.draft.created", "hr.payroll.approved", "hr.payroll.released", "hr.payroll.draft.archived"
    ]) assert.ok(actions.includes(action), "missing persisted audit action " + action);

    // Simulate audit-projection downtime: the business write is acknowledged as
    // pending (202), the embedded outbox remains, and a later drain materializes it.
    const originalCreate = EnterpriseAuditEvent.create;
    EnterpriseAuditEvent.create = async () => { throw new Error("simulated audit projection outage"); };
    let pendingResult;
    try {
      pendingResult = await call(hrUser, companyAId, "/challans", "POST", {
        month: "2026-08", type: "Other", amount: 50, reference: "OUTBOX-RETRY"
      });
    } finally {
      EnterpriseAuditEvent.create = originalCreate;
    }
    assert.equal(pendingResult.status, 202);
    assert.equal(pendingResult.body.audit.status, "pending");
    const pendingChallan = await HRChallan.findOne({ companyId: companyA._id, reference: "OUTBOX-RETRY" }).lean();
    assert.equal(pendingChallan.auditOutbox.length, 1);
    const pendingEventId = pendingResult.body.audit.eventId;
    const drain = await drainHRAuditOutbox();
    assert.ok(drain.recorded >= 1 || drain.pending === 0, JSON.stringify(drain));
    assert.ok(await EnterpriseAuditEvent.findById(pendingEventId));
    const clearedChallan = await HRChallan.findById(pendingChallan._id).lean();
    assert.equal(clearedChallan.auditOutbox.length, 0);

    // Migration dry-runs must be read-only: verify both document state and
    // collection/index metadata against the isolated standalone MongoDB.
    const snapshotCollections = async () => {
      const names = (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray())
        .map(item => item.name).sort();
      const indexes = {};
      for (const name of names) {
        indexes[name] = (await mongoose.connection.db.collection(name).listIndexes().toArray())
          .map(item => ({ name: item.name, key: item.key, unique: Boolean(item.unique) }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      return { names, indexes };
    };
    const scriptsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../scripts");
    const temporaryDirectory = mkdtempSync(resolve(tmpdir(), "shivasha-hr-migration-test-"));
    try {
      const beforeIndexDryRun = await snapshotCollections();
      const indexDryRun = spawnSync(process.execPath, [resolve(scriptsDirectory, "migrateHRIndexes.js")], {
        cwd: resolve(scriptsDirectory, ".."),
        encoding: "utf8",
        env: { ...process.env, MONGODB_URI: mongoUri, HR_MIGRATION_ALLOW_NON_TEST_DATABASE: "" }
      });
      assert.equal(indexDryRun.status, 0, indexDryRun.stderr || indexDryRun.stdout);
      assert.match(indexDryRun.stdout, /"mode": "dry-run"/);
      assert.deepEqual(await snapshotCollections(), beforeIndexDryRun,
        "index dry-run must not create/drop collections or indexes");

      const legacyEmployeeId = new mongoose.Types.ObjectId();
      await HREmployee.collection.insertOne({
        _id: legacyEmployeeId, companyId: null, employeeCode: "LEGACY-DRY-RUN",
        name: "Legacy Dry Run Employee", createdBy: hrUser._id,
        createdAt: new Date(), updatedAt: new Date()
      });
      const mappingPath = resolve(temporaryDirectory, "owner-company-map.json");
      writeFileSync(mappingPath, JSON.stringify({ [String(hrUser._id)]: String(companyA._id) }));

      // Non-test database targets and --apply without exact approval are
      // rejected before any connection or migration work can begin.
      const migrationCommands = [
        [resolve(scriptsDirectory, "migrateHRIndexes.js"), []],
        [resolve(scriptsDirectory, "migrateHRCompanyOwnership.js"), ["--mapping=" + mappingPath]]
      ];
      for (const [script, args] of migrationCommands) {
        const blockedTarget = spawnSync(process.execPath, [script, ...args], {
          cwd: resolve(scriptsDirectory, ".."), encoding: "utf8",
          env: { ...process.env, MONGODB_URI: "mongodb://127.0.0.1:27017/shivasha_migration_guard", HR_MIGRATION_ALLOW_NON_TEST_DATABASE: "" }
        });
        assert.notEqual(blockedTarget.status, 0);
        assert.match(blockedTarget.stderr, /Refusing non-test database/);

        const blockedApply = spawnSync(process.execPath, [script, ...args, "--apply"], {
          cwd: resolve(scriptsDirectory, ".."), encoding: "utf8",
          env: { ...process.env, MONGODB_URI: mongoUri, HR_MIGRATION_ALLOW_APPLY: "true" }
        });
        assert.notEqual(blockedApply.status, 0);
        assert.match(blockedApply.stderr, /Refusing --apply/);
      }

      const beforeOwnershipDryRun = await snapshotCollections();
      const ownershipDryRun = spawnSync(process.execPath, [
        resolve(scriptsDirectory, "migrateHRCompanyOwnership.js"), "--mapping=" + mappingPath
      ], {
        cwd: resolve(scriptsDirectory, ".."),
        encoding: "utf8",
        env: { ...process.env, MONGODB_URI: mongoUri, HR_MIGRATION_ALLOW_NON_TEST_DATABASE: "" }
      });
      assert.equal(ownershipDryRun.status, 0, ownershipDryRun.stderr || ownershipDryRun.stdout);
      assert.match(ownershipDryRun.stdout, /"mode": "dry-run"/);
      assert.match(ownershipDryRun.stdout, /"employees": 1/);
      assert.deepEqual(await snapshotCollections(), beforeOwnershipDryRun,
        "ownership dry-run must not change documents, collections or indexes");
      const unchangedLegacyEmployee = await HREmployee.collection.findOne({ _id: legacyEmployeeId });
      assert.equal(unchangedLegacyEmployee.companyId, null,
        "ownership dry-run must report but never assign tenant ownership");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
