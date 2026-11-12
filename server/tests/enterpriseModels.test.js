import test from "node:test";
import assert from "node:assert/strict";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import EnterpriseAuditEvent from "../models/EnterpriseAuditEvent.js";

const objectId = "507f1f77bcf86cd799439011";
const companyData = {
  name: "SHIVASHA Technologies",
  legalName: "SHIVASHA Technologies Private Limited",
  entityType: "private_limited",
  countryCode: "IN",
  functionalCurrency: "INR",
  reportingCurrency: "INR",
  fiscalYearStartMonth: 4,
  timeZone: "Asia/Kolkata",
  taxJurisdictions: ["IN-UP"],
  createdBy: objectId
};

test("company model accepts a complete India company profile", () => {
  const company = new Company(companyData);
  assert.equal(company.validateSync(), undefined);
  assert.equal(company.configurationVersion, 1);
  assert.equal(company.status, "active");
});

test("company model rejects missing legal identity and invalid fiscal month", () => {
  const company = new Company({ ...companyData, legalName: "", fiscalYearStartMonth: 13 });
  const error = company.validateSync();
  assert.ok(error);
  assert.ok(error.errors.legalName);
  assert.ok(error.errors.fiscalYearStartMonth);
});

test("company model restricts supported legal entity types", () => {
  const company = new Company({ ...companyData, entityType: "unregistered_magic_company" });
  assert.ok(company.validateSync()?.errors.entityType);
});

test("membership model only accepts known enterprise roles", () => {
  const valid = new CompanyMembership({
    companyId: objectId, userId: objectId, invitedBy: objectId,
    role: "finance_manager", status: "active"
  });
  assert.equal(valid.validateSync(), undefined);

  const invalid = new CompanyMembership({
    companyId: objectId, userId: objectId, invitedBy: objectId,
    role: "super_admin_from_client", status: "active"
  });
  assert.ok(invalid.validateSync()?.errors.role);
});

test("company membership has a unique company-user compound index", () => {
  const indexes = CompanyMembership.schema.indexes();
  assert.ok(indexes.some(([keys, options]) =>
    keys.companyId === 1 && keys.userId === 1 && options.unique === true
  ));
});

test("audit event identity and event fields are immutable in the Mongoose model", () => {
  for (const path of ["companyId", "actorUserId", "action", "resourceType", "resourceId", "details", "occurredAt"]) {
    assert.equal(EnterpriseAuditEvent.schema.path(path).options.immutable, true);
  }
});

test("company model rejects unsupported currency codes and invalid time zones", () => {
  const badCurrency = new Company({ ...companyData, functionalCurrency: "ZZZ" });
  assert.ok(badCurrency.validateSync()?.errors.functionalCurrency);

  const badTimeZone = new Company({ ...companyData, timeZone: "Not/A_Timezone" });
  assert.ok(badTimeZone.validateSync()?.errors.timeZone);
});

import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";

test("all HR record models carry company ownership and require it for new documents", () => {
  for (const model of [HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun]) {
    assert.ok(model.schema.path("companyId"), model.modelName + " must define companyId");
    assert.equal(model.schema.path("companyId").options.ref, "EnterpriseCompany");
    assert.equal(model.schema.path("companyId").isRequired, true, model.modelName + " must require tenant ownership for new documents");
  }
});

test("HR models define company-first query indexes", () => {
  const expectations = [
    [HREmployee, ["companyId", "employeeCode"]],
    [HRAttendance, ["companyId", "employee", "date"]],
    [HRChallan, ["companyId", "month", "type"]],
    [HRPayrollRun, ["companyId", "month"]]
  ];
  for (const [model, keys] of expectations) {
    const found = model.schema.indexes().some(([indexKeys]) =>
      keys.every((key, index) => Object.keys(indexKeys)[index] === key)
    );
    assert.ok(found, model.modelName + " must have a company-scoped index");
  }
});

test("employee code and payroll month uniqueness are company-scoped while legacy null tenants are excluded", () => {
  for (const [model, keys] of [
    [HREmployee, { companyId: 1, employeeCode: 1 }],
    [HRPayrollRun, { companyId: 1, month: 1 }]
  ]) {
    const index = model.schema.indexes().find(([indexKeys]) => JSON.stringify(indexKeys) === JSON.stringify(keys));
    assert.ok(index, model.modelName + " company unique index must exist");
    assert.equal(index[1].unique, true);
    assert.deepEqual(index[1].partialFilterExpression, { companyId: { $type: "objectId" } });
  }
});

test("attendance uniqueness is scoped to a company and excludes legacy null tenants", () => {
  const index = HRAttendance.schema.indexes().find(([keys]) =>
    JSON.stringify(keys) === JSON.stringify({ companyId: 1, employee: 1, date: 1 })
  );
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { companyId: { $type: "objectId" } });
});

test("payroll run model stores maker-checker approval and payment evidence", () => {
  for (const path of ["createdBy", "approvedBy", "approvedAt", "paidBy", "paidAt"]) {
    assert.ok(HRPayrollRun.schema.path(path), "Payroll run must store " + path);
  }
});
